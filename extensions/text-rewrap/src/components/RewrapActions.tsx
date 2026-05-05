import { Action, ActionPanel } from "@raycast/api";

interface FormValues {
  text: string;
  width: string;
  copyResultToClipboard: boolean;
}

interface RewrapActionsProps {
  onSubmit: (values: FormValues) => void;
  rewrappedText?: string;
}

export function RewrapActions({ onSubmit, rewrappedText }: RewrapActionsProps) {
  return (
    <ActionPanel>
      <Action.SubmitForm title="Rewrap Text" onSubmit={onSubmit} />
      {rewrappedText && (
        <Action.CopyToClipboard
          title="Copy Rewrapped Text"
          content={rewrappedText}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      )}
    </ActionPanel>
  );
}
