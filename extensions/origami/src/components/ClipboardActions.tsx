import { Action, ActionPanel, Icon } from "@raycast/api";
import { Field } from "../types";

interface ClipboardActionsProps {
  emailFields: Field[];
  phoneFields: Field[];
  instanceId: string;
}

/**
 * Provides clipboard-related actions for copying instance data
 */
export function ClipboardActions({ emailFields, phoneFields, instanceId }: ClipboardActionsProps) {
  return (
    <ActionPanel.Section title="Clipboard">
      {emailFields.length === 1 && (
        <Action.CopyToClipboard
          title="Copy Email Address"
          content={String(emailFields[0].value)}
          shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
        />
      )}
      {emailFields.length > 1 && (
        <ActionPanel.Submenu
          title="Copy Email Address"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
        >
          {emailFields.map((field: Field, index: number) => (
            <Action.CopyToClipboard
              key={`copy-email-${field.field_id}-${index}`}
              title={String(field.value)}
              content={String(field.value)}
              icon=""
            />
          ))}
        </ActionPanel.Submenu>
      )}

      {phoneFields.length === 1 && (
        <Action.CopyToClipboard
          title="Copy Phone Number"
          content={String(phoneFields[0].value)}
          shortcut={{ modifiers: ["opt", "cmd"], key: "c" }}
        />
      )}
      {phoneFields.length > 1 && (
        <ActionPanel.Submenu
          title="Copy Phone Number"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["opt", "cmd"], key: "c" }}
        >
          {phoneFields.map((field: Field, index: number) => (
            <Action.CopyToClipboard
              key={`copy-phone-${field.field_id}-${index}`}
              title={String(field.value)}
              content={String(field.value)}
              icon=""
            />
          ))}
        </ActionPanel.Submenu>
      )}

      <Action.CopyToClipboard
        title="Copy Instance ID"
        content={instanceId}
        shortcut={{ modifiers: ["ctrl", "cmd"], key: "c" }}
      />
    </ActionPanel.Section>
  );
}
