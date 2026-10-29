import { Action, ActionPanel, Form, Icon, PopToRootType, closeMainWindow, showHUD } from "@raycast/api";
import { useState } from "react";
import { clipNoteURL, openInBackground } from "./lib/deeplink";

interface FormValues {
  text: string;
}

/**
 * A place to type, and nothing else.
 *
 * This mirrors Jotaid's own Quick Note rather than a capture form: the point is to get as
 * much out of your head as possible before the thought goes. Fields for a source title and
 * link used to sit under the text area, but filling those in by hand is the job Quick Capture
 * already does automatically — keeping them here made the two commands the same command,
 * and taxed every note with metadata almost nobody would type twice.
 */
export default function Command() {
  const [textError, setTextError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    if (values.text.trim().length === 0) {
      setTextError("Write something first");
      return;
    }

    // Order matters, and it is the whole reason Jotaid used to steal the screen.
    //
    // Raycast has to be dismissed *before* the note is handed over. While its window is
    // still up, closing it later makes macOS hand the foreground to someone, and the app
    // just woken by `open -g` is the obvious candidate — so Jotaid came forward despite the
    // `-g`. Dismiss first and the foreground has already gone back to whatever you were in,
    // where `-g` cannot disturb it. Quick Capture has always done it in this order.
    //
    // No `popToRootType` here: `Immediate` would tear the command down on this line and the
    // confirmation below would never run. It goes on `showHUD`, which ends the command
    // anyway — and it must be `Immediate`, because the default defers to the user's "Pop to
    // Root Search" preference, and with that off, summoning Raycast again lands back on this
    // form still holding the note that was already filed.
    await closeMainWindow({ clearRootSearch: true });
    await openInBackground(clipNoteURL({ text: values.text, sourceApp: "Raycast" }));
    await showHUD("Saved to Jotaid Inbox", {
      popToRootType: PopToRootType.Immediate,
      clearRootSearch: true,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Inbox" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* No `title`: Raycast reserves a left-hand column for it, and "Note" labels the only
          field on the form — it costs width and says nothing. The field's own size and the
          position of that label are fixed by the platform; there is no prop for either. */}
      <Form.TextArea
        id="text"
        placeholder="Write your note in Markdown"
        error={textError}
        onChange={() => setTextError(undefined)}
        enableMarkdown
        autoFocus
      />
      <Form.Description text="Saved to your Inbox, tagged “clipping”." />
    </Form>
  );
}
