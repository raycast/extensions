import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { PreflightCheck, PreflightCheckId, PreflightResult } from "../lib/preflight";
import { AUTHOR_URL } from "../lib/feedback";
import { getModels } from "../services/models";
import { FeedbackAction } from "./FeedbackAction";

const APPLE_INTELLIGENCE_URL = "x-apple.systempreferences:com.apple.Siri-Settings.extension";
const ACCESSIBILITY_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
const LICENSE_COMMAND = "fm license";
const CONTEXT_NOTE = "About 4,096 tokens per request, shared by instructions, input and answer";

const STATUS_ICONS: Record<PreflightCheck["status"], { source: Icon; tintColor: Color }> = {
  ok: { source: Icon.CheckCircle, tintColor: Color.Green },
  failed: { source: Icon.XMarkCircle, tintColor: Color.Red },
  skipped: { source: Icon.Circle, tintColor: Color.SecondaryText },
};

export function SetupStatus(props: {
  result?: PreflightResult;
  isLoading: boolean;
  onRecheck: () => void;
  error?: string;
}) {
  const { data: models, isLoading: modelsLoading } = usePromise(getModels);
  const recheck = <Action title="Recheck" icon={Icon.ArrowClockwise} onAction={props.onRecheck} />;

  return (
    <List isLoading={props.isLoading || modelsLoading}>
      {props.error && (
        <List.Section title="Error">
          <List.Item
            icon={STATUS_ICONS.failed}
            title={props.error}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Error" content={props.error} />
                {recheck}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Setup">
        {props.result?.checks.map((check) => (
          <List.Item
            key={check.id}
            icon={STATUS_ICONS[check.status]}
            title={check.title}
            subtitle={check.message}
            actions={
              <ActionPanel>
                {check.status === "failed" && checkActions(check.id)}
                {recheck}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Info">
        <List.Item
          icon={Icon.Keyboard}
          title="Accessibility"
          subtitle="Needed to read selected text"
          actions={
            <ActionPanel>
              <Action.Open title="Open Accessibility Settings" target={ACCESSIBILITY_URL} />
              {recheck}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.ComputerChip}
          title="Models"
          subtitle={models?.join(", ")}
          actions={<ActionPanel>{recheck}</ActionPanel>}
        />
        <List.Item
          icon={Icon.Info}
          title="Context"
          subtitle={CONTEXT_NOTE}
          actions={<ActionPanel>{recheck}</ActionPanel>}
        />
      </List.Section>
      <List.Section title="About">
        <List.Item
          icon={Icon.Person}
          title="Made by Matloob Altaf"
          subtitle="Found a bug or have an idea? Open a GitHub issue."
          accessories={[{ text: "GitHub Issues" }]}
          actions={
            <ActionPanel>
              <FeedbackAction />
              <Action.OpenInBrowser title="Say Hi at Matloob.pk" icon={Icon.Globe} url={AUTHOR_URL} />
              {recheck}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function checkActions(id: PreflightCheckId) {
  if (id === "license") {
    return (
      <>
        <Action.CopyToClipboard title="Copy Command" content={LICENSE_COMMAND} />
        <Action.Open title="Open Terminal" target="/System/Applications/Utilities/Terminal.app" />
      </>
    );
  }
  if (id === "available") {
    return <Action.Open title="Open System Settings" target={APPLE_INTELLIGENCE_URL} />;
  }
  return null;
}
