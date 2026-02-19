import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { SetApiKeyAction } from "./components/SetApiKeyAction";
import {
  getRecoveryHint,
  getUserFacingErrorMessage,
  quickSaveCard,
} from "./lib/api";
import { getPreferences } from "./lib/preferences";

type FormValues = {
  content: string;
};

export default function QuickSaveCommand() {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { apiKey } = getPreferences();
  const hasApiKey = Boolean(apiKey?.trim());

  const handleSubmit = async (values: FormValues) => {
    const trimmed = values.content.trim();
    if (!trimmed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to save",
        message: "Enter text or a URL before saving.",
      });
      return;
    }

    setIsSaving(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Teak...",
    });

    try {
      const result = await quickSaveCard(trimmed);
      if (result.status === "duplicate") {
        toast.style = Toast.Style.Success;
        toast.title = "Already saved";
        toast.message = "This URL already exists in your Teak vault.";
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Saved to Teak";
      }
      await showHUD("Teak capture complete");
      setContent("");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Save failed";
      const hint = getRecoveryHint(error);
      toast.message = hint
        ? `${getUserFacingErrorMessage(error)} ${hint}`
        : getUserFacingErrorMessage(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasApiKey) {
    return <MissingApiKeyDetail />;
  }

  return (
    <Form
      navigationTitle="Quick Save to Teak"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Plus}
            onSubmit={handleSubmit}
            title={isSaving ? "Saving..." : "Save to Teak"}
          />
          <SetApiKeyAction />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        onChange={setContent}
        placeholder="Paste or type text, links, or notes..."
        title="Content"
        value={content}
      />
    </Form>
  );
}
