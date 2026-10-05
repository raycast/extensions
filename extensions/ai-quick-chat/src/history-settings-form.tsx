import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getHistorySettings, saveHistorySettings } from "./history-store";

export function HistorySettingsForm(props: {
  onSaved?: () => void | Promise<void>;
}) {
  const { pop } = useNavigation();
  const [mode, setMode] = useState<"unlimited" | "limit">("unlimited");
  const [limit, setLimit] = useState("100");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void getHistorySettings().then((settings) => {
      if (settings.sessionLimit === "unlimited") setMode("unlimited");
      else {
        setMode("limit");
        setLimit(String(settings.sessionLimit));
      }
      setIsLoading(false);
    });
  }, []);

  const submit = async () => {
    const numericLimit = Number(limit);
    if (
      mode === "limit" &&
      (!Number.isInteger(numericLimit) || numericLimit <= 0)
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a positive whole number",
      });
      return;
    }
    await saveHistorySettings({
      sessionLimit: mode === "unlimited" ? "unlimited" : numericLimit,
    });
    await props.onSaved?.();
    await showToast({
      style: Toast.Style.Success,
      title: "History settings saved",
    });
    pop();
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="History Settings"
      actions={
        <ActionPanel>
          <Action
            title="Save Settings"
            icon={Icon.Checkmark}
            onAction={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="retention"
        title="Keep Conversations"
        value={mode}
        onChange={(value) => setMode(value as typeof mode)}
      >
        <Form.Dropdown.Item value="unlimited" title="Unlimited Count" />
        <Form.Dropdown.Item value="limit" title="Custom Limit" />
      </Form.Dropdown>
      {mode === "limit" ? (
        <Form.TextField
          id="limit"
          title="Conversation Limit"
          value={limit}
          onChange={setLimit}
        />
      ) : null}
      <Form.Description
        title="Storage Limit"
        text="Encrypted history is capped at 10 GB. The oldest conversations are removed automatically when the cap is reached."
      />
    </Form>
  );
}
