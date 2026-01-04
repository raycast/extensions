/**
 * Generate ASCII Art command
 * Converts text input to ASCII art using figlet
 */
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useCallback } from "react";
import { GenerateView } from "./components/generate";
import { t } from "./constants";

export default function Command() {
  const [text, setText] = useState("");
  const { push } = useNavigation();

  const handleSubmit = useCallback(() => {
    if (!text.trim()) {
      showToast({ style: Toast.Style.Failure, title: t("toasts.pleaseEnterText") });
      return;
    }
    push(<GenerateView text={text} />);
  }, [text, push]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("actions.generateAsciiArt")} icon={Icon.Text} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title={t("labels.text")}
        placeholder={t("labels.enterTextPlaceholder")}
        value={text}
        onChange={setText}
        autoFocus
      />
    </Form>
  );
}
