import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useFetch, useForm } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ResultDetail } from "./components/ResultDetail";
import { calculateResult, getIndexCode } from "./services/calculations";
import { FinancialIndexData, FormValues } from "./types";
import { priceIndexes } from "./utils/constants";
import { formatDate, formatNumber } from "./utils/formatting";
import { parseCurrency } from "./utils/parsing";

export default function Command() {
  const [fetchUrl, setFetchUrl] = useState<string | null>(null);
  const [resultPushed, setResultPushed] = useState(false);
  const [formattedValue, setFormattedValue] = useState(formatNumber(0, { style: "currency", currency: "BRL" }));
  const { push } = useNavigation();

  const handleFormSubmit = useCallback((formValues: FormValues) => {
    setResultPushed(false);
    const { endDate, priceIndex } = formValues;
    const endDateString = formatDate(endDate);
    const indexCode = getIndexCode(priceIndex);
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${indexCode}/dados?formato=json&dataFinal=${endDateString}&timestamp=${Date.now()}`;

    setFetchUrl(url);

    showToast({
      style: Toast.Style.Animated,
      title: "Fetching data for calculation…",
    });
  }, []);

  const { handleSubmit, itemProps, values, setValue, setValidationError } = useForm<FormValues>({
    validation: {
      financialValue: (value) => {
        if (!value || value === formatNumber(0, { style: "currency", currency: "BRL" })) return "Field required";
        const numericValue = parseCurrency(value);
        if (isNaN(numericValue) || numericValue <= 0) return "Invalid number format";
      },
      startDate: (value) => {
        if (!value) return "Field required";
        const today = new Date();
        if (value > today) return "Future date not allowed";
      },
      endDate: (value) => {
        if (!value) return "Field required";
        const today = new Date();
        if (value > today) return "Future date not allowed";
        if (values.startDate && value < values.startDate) return "End date before start date";
      },
      priceIndex: (value) => {
        if (!value) return "Field required";
      },
    },
    onSubmit: handleFormSubmit,
  });

  const handleFinancialValueChange = useCallback(
    (newValue: string) => {
      const numericValue = parseCurrency(newValue);
      const formatted = isNaN(numericValue)
        ? formatNumber(0, { style: "currency", currency: "BRL" })
        : formatNumber(numericValue, { style: "currency", currency: "BRL" });
      setFormattedValue(formatted);
      setValue("financialValue", formatted);

      setValidationError("financialValue", null);
    },
    [setValue, setValidationError],
  );

  const { data: fetchedData, isLoading: isFetching } = useFetch<FinancialIndexData[]>(fetchUrl || "", {
    execute: !!fetchUrl,
  });

  const calculationResult = useMemo(() => {
    if (fetchedData && values.financialValue && values.startDate && values.endDate && values.priceIndex) {
      try {
        const { financialValue, startDate, endDate, priceIndex } = values;
        const financialValueNumber = parseCurrency(financialValue);
        const startDateString = formatDate(startDate);
        const endDateString = formatDate(endDate);

        const result = calculateResult(financialValueNumber, startDateString, endDateString, priceIndex, fetchedData);

        showToast({
          style: Toast.Style.Success,
          title: "Calculation complete",
        });

        return result;
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }
    return null;
  }, [fetchedData, values.financialValue, values.startDate, values.endDate, values.priceIndex]);

  useEffect(() => {
    if (calculationResult && !resultPushed) {
      push(<ResultDetail result={calculationResult} />);
      setResultPushed(true);
    }
  }, [calculationResult, resultPushed, push]);

  return (
    <Form
      isLoading={isFetching}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.financialValue}
        title="Financial Value"
        placeholder="Enter amount in BRL"
        value={formattedValue}
        onChange={handleFinancialValueChange}
      />
      <Form.DatePicker {...itemProps.startDate} title="Start Date" />
      <Form.DatePicker {...itemProps.endDate} title="End Date" />
      <Form.Dropdown {...itemProps.priceIndex} title="Price Index">
        {priceIndexes.map((index) => (
          <Form.Dropdown.Item key={index} value={index} title={index} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
