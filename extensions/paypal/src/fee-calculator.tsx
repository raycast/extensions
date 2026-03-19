import { Form, ActionPanel, Action, Icon, Clipboard, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useForm } from "@raycast/utils";

type RouteInfo = {
  canHold: boolean;
  percentage: number;
  fixedFee: number;
  fxSpread: number;
};

const feesJSON: Record<string, Record<string, RouteInfo>> = {
  USD: {
    USD: { canHold: true, percentage: 2.9, fixedFee: 0.3, fxSpread: 0 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
  EUR: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: true, percentage: 2.9, fixedFee: 0.35, fxSpread: 0 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
  GBP: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: true, percentage: 2.9, fixedFee: 0.2, fxSpread: 0 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
  INR: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 3.5, fixedFee: 3, fxSpread: 0 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
  AUD: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: true, percentage: 2.9, fixedFee: 0.3, fxSpread: 0 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
  CAD: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: true, percentage: 2.9, fixedFee: 0.3, fxSpread: 0 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
  JPY: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: true, percentage: 2.9, fixedFee: 40, fxSpread: 0 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
  SGD: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: true, percentage: 2.9, fixedFee: 0.3, fxSpread: 0 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
  CHF: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: true, percentage: 2.9, fixedFee: 0.3, fxSpread: 0 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
  HKD: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: true, percentage: 2.9, fixedFee: 2.35, fxSpread: 0 },
  },
  CNY: {
    USD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    EUR: { canHold: false, percentage: 4.4, fixedFee: 0.35, fxSpread: 3.5 },
    GBP: { canHold: false, percentage: 4.4, fixedFee: 0.2, fxSpread: 3.5 },
    INR: { canHold: false, percentage: 4.4, fixedFee: 3, fxSpread: 3.5 },
    AUD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CAD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    JPY: { canHold: false, percentage: 4.4, fixedFee: 40, fxSpread: 3.5 },
    SGD: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    CHF: { canHold: false, percentage: 4.4, fixedFee: 0.3, fxSpread: 3.5 },
    HKD: { canHold: false, percentage: 4.4, fixedFee: 2.35, fxSpread: 3.5 },
  },
};

interface FormValues {
  sourceCurrency: string;
  destinationCurrency: string;
  transactionCategory: string;
  transactionType: string;
  transactionValue: string;
}

export default function Command() {
  const [calculatedResult, setCalculatedResult] = useState<{ get: string; fee: string } | null>(null);
  const [adviceMessage, setAdviceMessage] = useState<string | null>(null);

  const calculateFee = (values: FormValues) => {
    const val = parseFloat(values.transactionValue.replace(",", ".") || "0");
    if (isNaN(val) || val <= 0) return null;

    const source = values.sourceCurrency;
    const dest = values.destinationCurrency;

    // Provide a fallback route if somehow missing
    const route = (feesJSON[source] && feesJSON[source][dest]) || {
      canHold: false,
      percentage: 4.4,
      fixedFee: 0.3,
      fxSpread: 3.5,
    };

    const feePct = route.percentage / 100;
    const fxPct = route.fxSpread / 100;

    const transactionFee = val * feePct + route.fixedFee;
    const amountAfterTransactionFee = val - transactionFee;
    const fxFee = amountAfterTransactionFee > 0 ? amountAfterTransactionFee * fxPct : 0;
    
    const standardFee = transactionFee + fxFee;
    const standardGet = val - standardFee;

    const grossAmount = (val / (1 - fxPct) + route.fixedFee) / (1 - feePct);

    return {
      fee: standardFee.toFixed(2),
      getAmount: standardGet > 0 ? standardGet.toFixed(2) : "0.00",
      grossAmount: grossAmount.toFixed(2),
      val: val.toString(),
      type: values.transactionType,
    };
  };

  const updateUI = (result: ReturnType<typeof calculateFee>) => {
    if (!result) {
      setCalculatedResult(null);
      setAdviceMessage(null);
      return null;
    }

    setCalculatedResult({ get: result.getAmount, fee: result.fee });

    if (result.type === "receiving") {
      setAdviceMessage(`To receive ${result.val}, you should ask for ${result.grossAmount}.`);
    } else {
      setAdviceMessage(`To send ${result.val}, you should pay ${result.grossAmount}.`);
    }

    return result.grossAmount;
  };

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: {
      sourceCurrency: "USD",
      destinationCurrency: "INR",
      transactionCategory: "commercial",
      transactionType: "receiving",
      transactionValue: "",
    },
    validation: {
      transactionValue: (value) => {
        if (!value) return "Required";
        const val = parseFloat(value.replace(",", "."));
        if (isNaN(val) || val <= 0) return "Must be a valid number greater than 0";
      },
      transactionCategory: (value) => {
        if (value !== "commercial") return "Coming soon...";
      },
    },
    onSubmit: (formValues) => {
      const result = calculateFee(formValues);
      updateUI(result);
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Fee" onSubmit={handleSubmit} icon={Icon.Calculator} />
          <Action
            title="Calculate & Copy"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onAction={async () => {
              if (values.transactionCategory !== "commercial") {
                await showToast({ style: Toast.Style.Failure, title: "Category coming soon..." });
                return;
              }
              const result = calculateFee(values);
              if (!result) {
                await showToast({ style: Toast.Style.Failure, title: "Please enter a valid amount" });
                return;
              }
              const total = updateUI(result);
              if (total) {
                await Clipboard.copy(total);
                await showToast({ style: Toast.Style.Success, title: "Copied to Clipboard", message: total });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Source Currency" {...itemProps.sourceCurrency}>
        <Form.Dropdown.Item value="USD" title="USD — US Dollar" />
        <Form.Dropdown.Item value="EUR" title="EUR — Euro" />
        <Form.Dropdown.Item value="GBP" title="GBP — British Pound" />
        <Form.Dropdown.Item value="JPY" title="JPY — Japanese Yen" />
        <Form.Dropdown.Item value="CNY" title="CNY — Chinese Yuan (Renminbi)" />
        <Form.Dropdown.Item value="CAD" title="CAD — Canadian Dollar" />
        <Form.Dropdown.Item value="HKD" title="HKD — Hong Kong Dollar" />
        <Form.Dropdown.Item value="AUD" title="AUD — Australian Dollar" />
        <Form.Dropdown.Item value="SGD" title="SGD — Singapore Dollar" />
        <Form.Dropdown.Item value="CHF" title="CHF — Swiss Franc" />
      </Form.Dropdown>

      <Form.Dropdown title="Destination Currency" {...itemProps.destinationCurrency}>
        <Form.Dropdown.Item value="INR" title="INR — Indian Rupee" />
        <Form.Dropdown.Item value="USD" title="USD — US Dollar" />
        <Form.Dropdown.Item value="EUR" title="EUR — Euro" />
        <Form.Dropdown.Item value="GBP" title="GBP — British Pound" />
        <Form.Dropdown.Item value="AUD" title="AUD — Australian Dollar" />
        <Form.Dropdown.Item value="CAD" title="CAD — Canadian Dollar" />
        <Form.Dropdown.Item value="JPY" title="JPY — Japanese Yen" />
        <Form.Dropdown.Item value="SGD" title="SGD — Singapore Dollar" />
        <Form.Dropdown.Item value="CHF" title="CHF — Swiss Franc" />
        <Form.Dropdown.Item value="HKD" title="HKD — Hong Kong Dollar" />
      </Form.Dropdown>

      <Form.Dropdown title="Transaction Category" {...itemProps.transactionCategory}>
        <Form.Dropdown.Item value="commercial" title="Goods & Services / Commercial Payments" />
        <Form.Dropdown.Item value="invoice" title="Invoice / B2B Payments (coming soon...)" />
        <Form.Dropdown.Item value="charity" title="Charity / Donations (coming soon...)" />
        <Form.Dropdown.Item value="personal" title="Friends & Family / Personal Transfers (coming soon...)" />
      </Form.Dropdown>

      <Form.Dropdown title="Transaction Type" {...itemProps.transactionType}>
        <Form.Dropdown.Item value="receiving" title="I am Receiving" />
        <Form.Dropdown.Item value="sending" title="I am Sending" />
      </Form.Dropdown>

      <Form.TextField title="Transaction Value" placeholder="0.00" {...itemProps.transactionValue} />

      {calculatedResult && (
        <>
          <Form.Separator />
          <Form.Description title="Get" text={calculatedResult.get} />
          <Form.Description title="Fee" text={calculatedResult.fee} />
        </>
      )}

      {adviceMessage && (
        <>
          <Form.Description title="Advice" text={adviceMessage} />
          <Form.Description
            title="Note"
            text="PayPal uses its own FX rate, which differs from online rates. Your bank may also charge a fee. No conversion fees apply if you hold the received currency in your account balance."
          />
        </>
      )}
    </Form>
  );
}
