import { useMemo, useState } from "react";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { ConversionResult } from "@/types/conversionResult";
import { actions as converterActions } from "@/utils/converterActions";

export default function Command() {
  const [text, setText] = useState("");

  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);

  const performConversion = (conversionFn: (input: string) => string, type: string) => {
    try {
      const result: ConversionResult = {
        original: text,
        converted: conversionFn(text),
        type: type,
      };

      setConversionResult(result);

      // Copy the result into clipboard for convenience
      Clipboard.copy(result.converted);

      // Show a success toast
      showToast({
        style: Toast.Style.Success,
        title: `Conversion Successful. Copied to Clipboard`,
      });
    } catch (error) {
      // Handle conversion errors
      showToast({
        style: Toast.Style.Failure,
        title: `${type} Conversion Failed`,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const clearResults = () => {
    setConversionResult(null);
    setText("");
  };

  const actions = useMemo(
    () => [
      ...(conversionResult?.converted
        ? [<Action.CopyToClipboard key="copy" title="Copy to Clipboard" content={conversionResult.converted} />]
        : []),
      ...converterActions.map(({ action, title, type }) => {
        return <Action key={title} title={title} onAction={() => performConversion(action, type)} />;
      }),
      <Action key="clear" title="Clear Results" onAction={clearResults} />,
    ],
    [text, conversionResult],
  );

  return (
    <Form actions={<ActionPanel>{actions}</ActionPanel>}>
      <Form.TextArea
        id="input"
        title="Paste you text here"
        placeholder="Enter text for conversion"
        value={text}
        onChange={(value) => setText(value)}
      />
      {conversionResult && (
        <>
          <Form.Description title="Conversion Results" text="Most recent conversion will appear below" />
          <Form.Description title={`${conversionResult.type} Result`} text={conversionResult.converted} />
        </>
      )}
    </Form>
  );
}
