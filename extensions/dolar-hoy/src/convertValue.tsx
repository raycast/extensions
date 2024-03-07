import { Action, ActionPanel, Detail, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { Currency, ResponseType } from "./types";
import { API_URL } from "./constants";
import { useEffect, useMemo } from "react";
import { getCurrencyName } from "./utils";

interface ConvertFormValues {
  amount: string;
  fromCurrency: string;
  toCurrency: string;
}

export default function Command() {
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ConvertFormValues>({
    onSubmit: (values) => {
      if (values.amount && values.fromCurrency && values.toCurrency) {
        push(
          <ConvertValue
            amount={parseFloat(values.amount)}
            fromCurrency={values.fromCurrency as Currency}
            toCurrency={values.toCurrency as Currency}
          />,
        );
      }
    },
    validation: {
      amount: (value) => {
        if (!value) return "This field is required";
        else if (Number.isNaN(Number(value))) return "Should be a number";
        else if (Number(value) < 0) return "Number should be positive";
      },
      fromCurrency: FormValidation.Required,
      toCurrency: FormValidation.Required,
    },
    initialValues: {
      fromCurrency: Currency.usd_blue,
      toCurrency: Currency.ars,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title={"Amount"} {...itemProps.amount} />
      <Form.Dropdown title={"From"} {...itemProps.fromCurrency}>
        {Object.values(Currency).map((currency) => (
          <Form.Dropdown.Item value={currency} title={getCurrencyName(currency)} key={`from-currency-${currency}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title={"To"} {...itemProps.toCurrency}>
        {Object.values(Currency).map((currency) => (
          <Form.Dropdown.Item value={currency} title={getCurrencyName(currency)} key={`from-currency-${currency}`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

type ConvertValueProps = {
  amount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
};

const ConvertValue = ({ amount, fromCurrency, toCurrency }: ConvertValueProps) => {
  const { isLoading, data, error: fetchError } = useFetch<ResponseType>(`${API_URL}/latest`);

  useEffect(() => {
    if (fetchError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: fetchError.message,
      });
    }
  }, [fetchError]);

  const getValueInArs = (currency: Currency): number => {
    switch (currency) {
      case Currency.ars:
        return 1;
      case Currency.usd_official:
        return data?.oficial.value_avg || 0;
      case Currency.usd_blue:
        return data?.blue.value_avg || 0;
    }
  };

  const conversionRatio = useMemo(() => {
    if (fromCurrency && toCurrency && data) {
      return getValueInArs(Currency[fromCurrency]) / getValueInArs(Currency[toCurrency]);
    }
    return 0;
  }, [fromCurrency, toCurrency, data]);

  const convertedValue = useMemo(() => amount * conversionRatio, [conversionRatio, amount]);

  const markdown = `
  ## Currency conversion
  
  ${amount.toLocaleString()} ${getCurrencyName(Currency[fromCurrency])} = ${convertedValue.toLocaleString()} ${getCurrencyName(Currency[toCurrency])}
  
  _Source: [Bluelytics](https://bluelytics.com.ar/#!/)_
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading || data === undefined}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={"Copy Conversion to Clipboard"} content={convertedValue} />
        </ActionPanel>
      }
    />
  );
};
