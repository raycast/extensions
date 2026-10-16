import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { useRef, useState } from "react";

export function MessageComposer(props: {
  draft: string;
  busy: boolean;
  ready: boolean;
  controls?: ActionPanel.Submenu.Props["children"];
  onChange: (text: string) => void;
  onSend: (text: string) => Promise<boolean>;
}) {
  const ignoreOpeningReset = useRef(true);
  const editRevision = useRef(0);
  const [restored, setRestored] = useState(false);
  const [query, setQuery] = useState("");
  const message = restored ? props.draft : query;
  const preview = message.replace(/\s+/g, " ").slice(0, 90);
  return (
    <ActionPanel.Submenu
      title={props.busy ? "Add Instructions" : "Enter Message"}
      icon={props.busy ? Icon.Plus : Icon.Pencil}
      shortcut={{ modifiers: [], key: "return" }}
      filtering={false}
      throttle={false}
      isLoading={!props.ready}
      onOpen={() => {
        editRevision.current += 1;
        ignoreOpeningReset.current = true;
        setQuery("");
        setRestored(Boolean(props.draft.trim()));
      }}
      onSearchTextChange={(text) => {
        // Native menus reset their search field when opening. Keep a saved
        // draft until the user types a replacement or explicitly clears it.
        if (ignoreOpeningReset.current && !text) {
          ignoreOpeningReset.current = false;
          return;
        }
        ignoreOpeningReset.current = false;
        editRevision.current += 1;
        setQuery(text);
        setRestored(false);
        // Closing a native menu also clears its search text. Keep the last
        // non-empty draft; an empty visible query can never send that old text.
        if (text) props.onChange(text);
      }}
    >
      <ActionPanel.Section
        title={
          preview
            ? `Pending · ${preview}`
            : "Type a message, press Enter to send"
        }
      >
        <Action
          title={
            restored
              ? "Send Saved Draft"
              : props.busy
                ? "Send Instructions"
                : "Send Message"
          }
          icon={Icon.ArrowRight}
          onAction={async () => {
            if (!message.trim()) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Enter a message in the input field first",
              });
              return;
            }
            const submittedRevision = editRevision.current;
            // A native menu can reopen while the CLI acknowledges an older
            // send. Keep any newer query, including identical text retyped.
            if (
              (await props.onSend(message)) &&
              editRevision.current === submittedRevision
            ) {
              setQuery("");
              setRestored(false);
            }
          }}
        />
      </ActionPanel.Section>
      {props.controls}
      <ActionPanel.Section>
        {props.draft.trim() && (
          <Action
            title="Clear Draft"
            icon={Icon.Eraser}
            onAction={() => {
              editRevision.current += 1;
              setQuery("");
              setRestored(false);
              props.onChange("");
            }}
          />
        )}
        {restored && (
          <Action.CopyToClipboard
            title="Copy Draft to Continue Editing"
            content={props.draft}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
