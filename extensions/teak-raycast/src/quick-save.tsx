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
import { useEffect, useRef, useState } from "react";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { SetApiKeyAction } from "./components/SetApiKeyAction";
import { SignOutAction } from "./components/SignOutAction";
import {
  getRecoveryHint,
  getUserFacingErrorMessage,
  quickSaveCard,
} from "./lib/api";
import { parseCaptureExtras, savedToastText } from "./lib/capture";
import { useTeakAuth } from "./lib/useTeakAuth";

interface FormValues {
  content: string;
  notes: string;
  tags: string;
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
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Set before the first await, so a second ⌘↵ can't save the card twice.
  const savingRef = useRef<boolean>(false);

  const {
    isAuthenticated,
    error: authError,
    isLoading: isCheckingAuth,
    refresh: refreshAuth,
  } = useTeakAuth();

  useEffect(() => {
    let isMounted = true;

    const loadClipboardText = async () => {
      const clipboard = await Clipboard.read().catch(() => undefined);
      // A copied file reads back as its name; Save Clipboard uploads the file.
      const clipboardText = clipboard?.file ? undefined : clipboard?.text;
      if (isMounted && clipboardText?.trim()) {
        setContent((current) => (current.trim() ? current : clipboardText));
      }
    };

    void loadClipboardText();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (values: FormValues) => {
    if (savingRef.current) {
      return;
    }
    if (!values.content.trim()) {
      await showToast({
        message: "Enter text or a URL before saving.",
        style: Toast.Style.Failure,
        title: "Nothing to save",
      });
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Teak...",
    });

    try {
      const result = await quickSaveCard(
        {
          content: values.content,
          source: "raycast_quick_save",
          ...parseCaptureExtras(values),
        },
        "interactive",
      );
      addSuccessActions(toast, result);
      const { message, title } = savedToastText(result);
      toast.style = Toast.Style.Success;
      toast.title = title;
      toast.message = message;

      setContent("");
      setTags("");
      setNotes("");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Save failed";
      const hint = getRecoveryHint(error);
      toast.message = hint
        ? `${getUserFacingErrorMessage(error)} ${hint}`
        : getUserFacingErrorMessage(error);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  if (isCheckingAuth) {
    return <Form isLoading navigationTitle="Quick Save to Teak" />;
  }

  if (!isAuthenticated) {
    return <MissingApiKeyDetail error={authError} onSignedIn={refreshAuth} />;
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
      isLoading={isSaving}
      navigationTitle="Quick Save to Teak"
    >
      <Form.TextArea
        id="content"
        onChange={setContent}
        placeholder="Paste or type text, links, or notes..."
        title="Content"
        value={content}
      />
      <Form.TextField
        id="tags"
        onChange={setTags}
        placeholder="design, research (optional)"
        title="Tags"
        value={tags}
      />
      <Form.TextArea
        id="notes"
        onChange={setNotes}
        placeholder="Add a note (optional)"
        title="Note"
        value={notes}
      />
    </Form>
  );
}
