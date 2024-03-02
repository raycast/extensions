import { Action, ActionPanel, Detail, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Currency, ResponseType } from "./types";
import { API_URL } from "./constants";
import { useEffect, useMemo, useState } from "react";
import { getCurrencyName } from "./utils";

enum ConvertFormFields {
  amount = "amount",
  fromCurrency = "fromCurrency",
  toCurrency = "toCurrency",
}

interface ConvertFormValue {
  [ConvertFormFields.amount]: string;
  [ConvertFormFields.fromCurrency]: Currency;
  [ConvertFormFields.toCurrency]: Currency;
}

type ConvertFormErrors = {
  [ConvertFormFields.amount]?: string;
  [ConvertFormFields.fromCurrency]?: string;
  [ConvertFormFields.toCurrency]?: string;
};

export default function Command() {
  const [formErrors, setFormErrors] = useState<ConvertFormErrors>({});
  const { push } = useNavigation();

  const onSubmit = ({ amount, fromCurrency, toCurrency }: ConvertFormValue) => {
    let errors: ConvertFormErrors = { ...formErrors };
    if (!amount) errors = { ...errors, amount: "This field is required" };
    if (!fromCurrency) errors = { ...errors, fromCurrency: "This field is required" };
    if (!toCurrency) errors = { ...errors, toCurrency: "This field is required" };
    if (amount && Number.isNaN(amount)) errors = { ...errors, amount: "Should be a number" };

    setFormErrors(errors);

    if (Object.values(errors).some((error) => error)) return;
    else push(<ConvertValue amount={parseFloat(amount)} fromCurrency={fromCurrency} toCurrency={toCurrency} />);
  };

  const dropErrorIfNeeded = (newValue: string, field: ConvertFormFields) => {
    if (formErrors[field]) {
      if (field === ConvertFormFields.amount) {
        if (newValue && !Number.isNaN(newValue)) setFormErrors({ ...formErrors, [field]: undefined });
      } else if (newValue) {
        setFormErrors({ ...formErrors, [field]: undefined });
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"amount"}
        title={"Amount"}
        error={formErrors.amount}
        onChange={(value) => dropErrorIfNeeded(value, ConvertFormFields.amount)}
      />
      <Form.Dropdown
        id={"fromCurrency"}
        title={"From"}
        defaultValue={Currency.usd_blue}
        error={formErrors.fromCurrency}
        onChange={(value) => dropErrorIfNeeded(value, ConvertFormFields.fromCurrency)}
      >
        {Object.values(Currency).map((currency) => (
          <Form.Dropdown.Item value={currency} title={getCurrencyName(currency)} key={`from-currency-${currency}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id={"toCurrency"}
        title={"To"}
        defaultValue={Currency.ars}
        error={formErrors.toCurrency}
        onChange={(value) => dropErrorIfNeeded(value, ConvertFormFields.toCurrency)}
      >
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
