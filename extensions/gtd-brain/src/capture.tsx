import { Action, ActionPanel, Form, Icon, LaunchProps, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { Authed } from "./components/Authed";
import { ApiError, userMessage } from "./lib/backend";
import { sendEvent } from "./lib/events";
import { captureToRequest, createCard } from "./lib/gtd";
import { dashboardUrl } from "./lib/links";

type Props = LaunchProps<{ arguments: Arguments.Capture }>;

// The capture surface: title + optional notes, straight to the top of Inbox. The root-search
// argument prefills the title so "Capture to Inbox call Sam" is one keystroke away from saved.
export default function Command(props: Props) {
  return (
    <Authed>
      {(_session, signOut) => <CaptureForm initialTitle={props.arguments.title ?? ""} signOut={signOut} />}
    </Authed>
  );
}

function CaptureForm({ initialTitle, signOut }: { initialTitle: string; signOut: () => Promise<void> }) {
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (!title.trim()) {
      setError("Write something first");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const card = await createCard(captureToRequest(title, notes));
      await sendEvent("card_created", {
        columnKind: "normal",
        via: "raycast_extension",
        withNotes: !!notes.trim(),
        cardId: card.id,
      });
      await showToast({ style: Toast.Style.Success, title: "Captured to Inbox", message: card.title });
      await popToRoot();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await showToast({ style: Toast.Style.Failure, title: "Signed out", message: "Sign in again to capture" });
        await signOut();
        return;
      }
      await showToast({ style: Toast.Style.Failure, title: "Could not capture", message: userMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form
      isLoading={busy}
      navigationTitle="Capture to Inbox"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture" icon={Icon.Tray} onSubmit={() => void submit()} />
          <Action.OpenInBrowser
            title="Open Inbox on Dashboard"
            url={dashboardUrl("inbox")}
            onOpen={() => void sendEvent("dashboard_opened", { target: "inbox" })}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What's on your mind?"
        value={title}
        error={error}
        autoFocus={!initialTitle}
        onChange={(v) => {
          setTitle(v);
          setError(undefined);
        }}
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Anything else worth keeping (optional)"
        value={notes}
        onChange={setNotes}
      />
      <Form.Description text="Lands at the top of your Inbox. Clarify it there or in the Inbox command." />
    </Form>
  );
}
