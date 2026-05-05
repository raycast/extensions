import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
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

const addSuccessActions = (
  toast: Toast,
  result: Awaited<ReturnType<typeof quickSaveCard>>,
) => {
  if (result.appUrl) {
    toast.primaryAction = {
      onAction: () => {
        void open(result.appUrl!);
      },
      title: "Open Card",
    };
  }

  if (result.card?.url) {
    toast.secondaryAction = {
      onAction: () => {
        void open(result.card!.url!);
      },
      title: "Open Source URL",
    };
  }
};

export default function QuickSaveCommand() {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { apiKey } = getPreferences();
  const hasApiKey = Boolean(apiKey?.trim());

  useEffect(() => {
    let isMounted = true;

    const loadClipboardText = async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (isMounted && !content.trim() && clipboardText?.trim()) {
          setContent(clipboardText.trim());
        }
      } catch {
        // Ignore clipboard prefill failures and keep the form usable.
      }
    };

    void loadClipboardText();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (values: FormValues) => {
    const trimmed = values.content.trim();
    if (!trimmed) {
      await showToast({
        message: "Enter text or a URL before saving.",
        style: Toast.Style.Failure,
        title: "Nothing to save",
      });
      return;
    }

    setIsSaving(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Teak...",
    });

    try {
      const result = await quickSaveCard({
        content: trimmed,
        source: "raycast_quick_save",
      });
      addSuccessActions(toast, result);
      toast.style = Toast.Style.Success;
      toast.title = "Saved to Teak";

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
      navigationTitle="Quick Save to Teak"
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
