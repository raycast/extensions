import { Action, ActionPanel, Icon } from "@raycast/api";
import { Field } from "../types";

interface CommunicationActionsProps {
  emailFields: Field[];
  phoneFields: Field[];
}

/**
 * Provides communication-related actions like email, phone calls, and messages
 */
export function CommunicationActions({ emailFields, phoneFields }: CommunicationActionsProps) {
  return (
    <ActionPanel.Section title="Communication">
      {emailFields.length === 1 && (
        <Action.OpenInBrowser
          title="Send Email"
          url={`mailto:${String(emailFields[0].value)}`}
          icon={Icon.Envelope}
          shortcut={{ modifiers: ["shift", "cmd"], key: "e" }}
        />
      )}
      {emailFields.length > 1 && (
        <ActionPanel.Submenu
          title="Send Email"
          icon={Icon.Envelope}
          shortcut={{ modifiers: ["shift", "cmd"], key: "e" }}
        >
          {emailFields.map((field: Field, index: number) => (
            <Action.OpenInBrowser
              key={`email-${field.field_id}-${index}`}
              title={String(field.value)}
              url={`mailto:${String(field.value)}`}
              icon=""
            />
          ))}
        </ActionPanel.Submenu>
      )}

      {phoneFields.length === 1 && (
        <>
          <Action.OpenInBrowser
            title="Call Via iPhone"
            url={`tel:${String(phoneFields[0].value)}`}
            icon={Icon.Phone}
            shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Call Via Facetime"
            url={`facetime:${String(phoneFields[0].value)}`}
            icon={Icon.Video}
            shortcut={{ modifiers: ["shift", "cmd"], key: "v" }}
          />
          <Action.OpenInBrowser
            title="Call Via Facetime Audio"
            url={`facetime-audio:${String(phoneFields[0].value)}`}
            icon={Icon.Headphones}
            shortcut={{ modifiers: ["shift", "cmd"], key: "a" }}
          />
          <Action.OpenInBrowser
            title="Send Message"
            url={`sms:${String(phoneFields[0].value)}`}
            icon={Icon.Message}
            shortcut={{ modifiers: ["shift", "cmd"], key: "m" }}
          />
        </>
      )}
      {phoneFields.length > 1 && (
        <>
          <ActionPanel.Submenu
            title="Call Via iPhone"
            icon={Icon.Phone}
            shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          >
            {phoneFields.map((field: Field, index: number) => (
              <Action.OpenInBrowser
                key={`call-${field.field_id}-${index}`}
                title={String(field.value)}
                url={`tel:${String(field.value)}`}
                icon=""
              />
            ))}
          </ActionPanel.Submenu>

          <ActionPanel.Submenu
            title="Call Via Facetime"
            icon={Icon.Video}
            shortcut={{ modifiers: ["shift", "cmd"], key: "v" }}
          >
            {phoneFields.map((field: Field, index: number) => (
              <Action.OpenInBrowser
                key={`facetime-${field.field_id}-${index}`}
                title={String(field.value)}
                url={`facetime:${String(field.value)}`}
                icon=""
              />
            ))}
          </ActionPanel.Submenu>

          <ActionPanel.Submenu
            title="Call Via Facetime Audio"
            icon={Icon.Headphones}
            shortcut={{ modifiers: ["shift", "cmd"], key: "a" }}
          >
            {phoneFields.map((field: Field, index: number) => (
              <Action.OpenInBrowser
                key={`facetime-audio-${field.field_id}-${index}`}
                title={String(field.value)}
                url={`facetime-audio:${String(field.value)}`}
                icon=""
              />
            ))}
          </ActionPanel.Submenu>

          <ActionPanel.Submenu
            title="Send Message"
            icon={Icon.Message}
            shortcut={{ modifiers: ["shift", "cmd"], key: "m" }}
          >
            {phoneFields.map((field: Field, index: number) => (
              <Action.OpenInBrowser
                key={`imessage-${field.field_id}-${index}`}
                title={String(field.value)}
                url={`imessage:${String(field.value)}`}
                icon=""
              />
            ))}
          </ActionPanel.Submenu>
        </>
      )}
    </ActionPanel.Section>
  );
}
