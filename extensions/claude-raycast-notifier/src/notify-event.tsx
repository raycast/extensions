import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  Icon,
  LaunchProps,
  List,
  open,
  showHUD,
} from "@raycast/api";
import { useState } from "react";
import { decodePayload } from "./lib/event";

type Arguments = { payload: string };

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  let event: ReturnType<typeof decodePayload> | null = null;
  try {
    event = decodePayload(props.arguments.payload);
  } catch {
    void showHUD("Invalid event payload");
    void closeMainWindow();
    return null;
  }

  const returnUrl = event.returnUrl ?? null;
  const openTitle = event.source ? `Open ${event.source}` : "Open AI App";
  const summary = eventSummary(event.source, event.type);

  if (!event.action) {
    void showHUD(summary);
    void closeMainWindow();
    return null;
  }

  if (event.action.kind === "input") {
    return (
      <InputActionView
        title={summary}
        returnUrl={event.returnUrl}
        source={event.source}
      />
    );
  }

  return (
    <List navigationTitle={summary} searchBarPlaceholder="Choices">
      <List.Section title={summary}>
        {(event.action.options ?? []).map((option) => (
          <List.Item
            key={option.id}
            icon={Icon.ExclamationMark}
            title={option.label}
            actions={
              <ActionPanel>
                <Action
                  title={`Copy Choice and Open ${event.source ?? "App"}`}
                  onAction={() => copyAndReturn(option.label, returnUrl)}
                />
                <Action.CopyToClipboard
                  title="Copy Choice"
                  content={option.label}
                />
                {event.returnUrl ? (
                  <Action.Open title={openTitle} target={event.returnUrl} />
                ) : null}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function InputActionView(props: {
  title: string;
  returnUrl?: string | null;
  source?: string | null;
}) {
  const [value, setValue] = useState("");
  const openTitle = props.source ? `Open ${props.source}` : "Open AI App";

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action
            title={`Copy Input and Open ${props.source ?? "App"}`}
            onAction={() => copyAndReturn(value, props.returnUrl ?? null)}
          />
          <Action.CopyToClipboard title="Copy Input" content={value} />
          {props.returnUrl ? (
            <Action.Open title={openTitle} target={props.returnUrl} />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description text={props.title} />
      <Form.TextArea
        id="response"
        title="Your Response"
        placeholder="Type the answer you want to send back in your AI app"
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}

async function copyAndReturn(value: string, target: string | null | undefined) {
  await Clipboard.copy(value);
  await showHUD("Copied to Clipboard");
  if (target) {
    await open(target);
  }
}

function eventSummary(source: string | null | undefined, type: string) {
  const subject = source ? capitalize(source) : "AI";
  if (type === "needs_input") return `${subject} Needs Input`;
  if (type === "done") return `${subject} Done`;
  return `${subject} ${capitalize(type)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
