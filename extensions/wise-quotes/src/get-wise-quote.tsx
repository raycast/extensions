import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  openCommandPreferences,
  showToast,
} from "@raycast/api";

import { Detail } from "@raycast/api";
import { useWiseQuoteQuery } from "./hooks";
import { formatCurrency } from "./utils";
import { FeeBreakdown } from "./components";
import { Preferences } from "./types";

interface Arguments {
  amount?: string;
  targetCurrency?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();

  const getSourceAmount = () => {
    if (props?.arguments?.amount && !isNaN(parseFloat(props?.arguments?.amount))) {
      return parseFloat(props?.arguments?.amount);
    }
    if (preferences?.defaultAmount && !isNaN(parseFloat(preferences?.defaultAmount))) {
      return parseFloat(preferences?.defaultAmount);
    }
    return 1;
  };

  const getTargetCurrency = () => {
    if (props.arguments?.targetCurrency) {
      return props.arguments.targetCurrency;
    }

    return preferences?.defaultTargetCurrency;
  };

  const sourceAmount = getSourceAmount();
  const targetCurrency = getTargetCurrency();
  const { isLoading, data, error, mutate } = useWiseQuoteQuery({
    sourceAmount,
    targetCurrency,
  });

  if (error) {
    const errorMarkdown = `
# Error
${error.message}

Please check:
- If the currency "${targetCurrency}" is correct and supported by Wise
- If the amount "${sourceAmount}" is correct
`;
    return (
      <Detail
        isLoading={false}
        navigationTitle={`Error: ${error.message}`}
        markdown={errorMarkdown}
        actions={
          <ActionPanel title="Actions">
            <Action
              title="Set Default Source Amount"
              icon={{
                source: Icon.Coins,
              }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={openCommandPreferences}
            />
            <Action
              title="Set Default Target Currency"
              icon={{
                source: Icon.Globe,
              }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!data) {
    return <Detail isLoading={true} />;
  }

  const availablePaymentOptions = data?.paymentOptions.filter((option) => !option.disabled);
  const preferredPaymentOption = availablePaymentOptions?.[0];
  const paymentOption = data?.paymentOptions?.[0];
  const disabledReason = paymentOption?.disabledReason;

  const noPaymentOptionAvailableMarkdown = `
****
**⚠️ Warning: No payment option available**

${disabledReason?.message ?? "Try with another parameters"}
****
`;

  const markdown = `
# Wise Transfer
You send exaclty **${formatCurrency(data.sourceAmount, data.sourceCurrency)}**

Recepient gets **${formatCurrency(
    preferredPaymentOption?.targetAmount ?? paymentOption?.targetAmount ?? 0,
    preferredPaymentOption?.targetCurrency ?? paymentOption?.targetCurrency ?? ""
  )}**

## Rate  
${data.rate}
${!preferredPaymentOption ? noPaymentOptionAvailableMarkdown : ""}
  `;

  async function refetch() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing...",
    });
    await mutate();
    toast.style = Toast.Style.Success;
    toast.title = "Data refreshed";
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel title="Actions">
          <Action.OpenInBrowser title="Start Transfer in Browser" url="https://wise.com/send#/enterpayment" />
          <Action.CopyToClipboard
            title="Copy Target Amount to Clipboard"
            content={`${preferredPaymentOption?.targetAmount}`}
          />
          <Action
            title="Refresh"
            icon={{ source: Icon.RotateClockwise }}
            onAction={refetch}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Set Default Source Amount"
            icon={{
              source: Icon.Coins,
            }}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={openCommandPreferences}
          />
          <Action
            title="Set Default Target Currency"
            icon={{
              source: Icon.Globe,
            }}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
      metadata={<FeeBreakdown paymentOption={preferredPaymentOption} rate={data.rate} />}
    />
  );
}
