import { showToast, Toast, useNavigation } from "@raycast/api";

import { getErrorMessage } from "../lib/errors";
import { formatJsonInput } from "../lib/format-json";
import { FormatResultDetail } from "./result-detail";
import { TextInputForm } from "./text-input-form";

export function FormatManualCommand() {
  const { push } = useNavigation();

  async function handleSubmit(input: string) {
    try {
      const result = formatJsonInput(input);
      push(<FormatResultDetail result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to format input",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <TextInputForm
      title="Format JSON"
      actionTitle="Format JSON"
      placeholder="Paste JSON, relaxed JSON, or logs containing JSON"
      onSubmit={handleSubmit}
    />
  );
}
