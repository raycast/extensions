import { Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";

import { getErrorMessage } from "../lib/errors";
import { formatJsonInput } from "../lib/format-json";
import { escapeJsonString, unescapeJsonString } from "../lib/json-string";
import { FormatResultDetail, TextResultDetail } from "./result-detail";
import { TextInputForm } from "./text-input-form";

type JsonStringCommandProps = {
  mode: "escape" | "unescape";
};

export function JsonStringCommand({ mode }: JsonStringCommandProps) {
  const { push } = useNavigation();
  const isEscape = mode === "escape";
  const title = isEscape ? "Escape JSON String" : "Unescape JSON String";

  async function handleSubmit(input: string) {
    try {
      const result = isEscape
        ? escapeJsonString(input)
        : unescapeJsonString(input);
      push(
        <TextResultDetail
          text={result}
          language={isEscape ? "json" : "text"}
          copyTitle={isEscape ? "Copy Escaped JSON" : "Copy Unescaped Text"}
          additionalAction={
            isEscape ? undefined : (
              <Action
                title="Format Unescaped Text"
                icon={Icon.Code}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
                onAction={() =>
                  push(<FormatResultDetail result={formatJsonInput(result)} />)
                }
              />
            )
          }
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Unable to ${mode} input`,
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <TextInputForm
      title={title}
      actionTitle={title}
      placeholder={
        isEscape
          ? "Enter text to serialize as a JSON string"
          : 'Enter a JSON string such as "{\\"key\\":1}"'
      }
      description={
        isEscape ? undefined : "Decodes exactly one JSON string layer."
      }
      onSubmit={handleSubmit}
    />
  );
}
