import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { SetApiKeyAction } from "./components/SetApiKeyAction";
import { SignOutAction } from "./components/SignOutAction";
import {
  getRecoveryHint,
  getUserFacingErrorMessage,
  quickSaveCard,
} from "./lib/api";
import { useTeakAuth } from "./lib/useTeakAuth";

interface FormValues {
  content: string;
}

const addSuccessActions = (
  toast: Toast,
  result: Awaited<ReturnType<typeof quickSaveCard>>,
) => {
  const appUrl = result.appUrl;
  if (appUrl) {
    toast.primaryAction = {
      onAction: () => {
        void open(appUrl);
      },
      title: "Open Card",
    };
  }

  const sourceUrl = result.card?.url;
  if (sourceUrl) {
    toast.secondaryAction = {
      onAction: () => {
        void open(sourceUrl);
      },
      title: "Open Source URL",
    };
  }
};

export default function QuickSaveCommand() {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const {
    isAuthenticated,
    isLoading: isCheckingAuth,
    refresh: refreshAuth,
  } = useTeakAuth();

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

  if (isCheckingAuth) {
    return <Form isLoading navigationTitle="Quick Save to Teak" />;
  }

  if (!isAuthenticated) {
    return <MissingApiKeyDetail onSignedIn={refreshAuth} />;
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
          <SignOutAction onSignedOut={refreshAuth} />
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
