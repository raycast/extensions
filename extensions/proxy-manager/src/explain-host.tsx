import { Action, ActionPanel, Color, Detail, Form, Icon, LaunchProps, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import * as api from "./lib/api";
import { frontmostApp, preferredHost } from "./lib/context";
import { errorMessage } from "./lib/control";
import { hostFromInput } from "./lib/host";
import { goToCommand, openDashboard, revealTarget } from "./lib/navigation";
import { modeLabel } from "./lib/presentation";
import { reportFailure } from "./lib/toast";
import type { Explanation, Status } from "./lib/types";

type Values = { host: string };

/**
 * Answers "why is this going direct?" in one keystroke. The host comes from the
 * command argument, then the tab the user is on, then the clipboard, then a
 * form — so the command is never a dead end.
 */
export default function ExplainHost(props: LaunchProps<{ arguments: Arguments.ExplainHost }>) {
  const [manual, setManual] = useState<string | null | undefined>(undefined);

  const { data: detected, isLoading: detecting } = usePromise(async () => {
    const app = await frontmostApp();
    const host = await preferredHost(props.arguments.host);
    return { host, app };
  }, []);

  const host = manual === undefined ? (detected?.host ?? null) : manual;
  const app = detected?.app ?? null;

  const {
    data: result,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (target: string | null, bundleId?: string) =>
      target
        ? {
            explanation: await api.explainHost(target, bundleId),
            status: await api.getStatus(),
          }
        : null,
    [host, app?.bundleId],
  );

  if (host === null) {
    if (manual === undefined && detecting) {
      return <Detail isLoading markdown="Looking at the tab you're on…" />;
    }
    return <HostForm onSubmit={setManual} />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# ${host}\n\n${errorMessage(error)}`}
        actions={
          <ActionPanel>
            <Action title="Open Proxy Manager" icon={Icon.AppWindow} onAction={() => openDashboard()} />
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            <Action title="Explain Another Host" icon={Icon.MagnifyingGlass} onAction={() => setManual(null)} />
          </ActionPanel>
        }
      />
    );
  }

  if (!result) {
    return <Detail isLoading markdown={`# ${host}\n\nAsking Proxy Manager…`} />;
  }

  const { explanation, status } = result;
  const matchedPattern = explanation.matchedPattern;
  const matchedId = explanation.matchedTargetID;

  return (
    <Detail
      isLoading={isLoading}
      markdown={explanationMarkdown(explanation, status)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Decision"
            text={explanation.decision === "tunnel" ? "Through the tunnel" : "Direct"}
            icon={
              explanation.decision === "tunnel"
                ? { source: Icon.Bolt, tintColor: Color.Green }
                : { source: Icon.Circle }
            }
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Matched target" text={matchedPattern ?? "None"} />
          {app ? <Detail.Metadata.Label title="App" text={app.name} /> : null}
          <Detail.Metadata.Label title="Per-app default" text={modeLabel(explanation.appMode)} />
          {explanation.appRuleKey ? <Detail.Metadata.Label title="App rule" text={explanation.appRuleKey} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {explanation.decision === "direct" && !matchedPattern ? (
              explanation.appMode === "DIRECT" ? (
                <Action
                  title="Open App Routing"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => goToCommand("app-routing")}
                />
              ) : (
                <Action
                  title="Add as Target"
                  icon={Icon.Plus}
                  onAction={async () => {
                    try {
                      await api.addTarget(explanation.host, true);
                      await showHUD(`Routing ${explanation.host}`);
                      await revalidate();
                    } catch (addError) {
                      await reportFailure(addError, "Couldn't add the target");
                    }
                  }}
                />
              )
            ) : null}
            {matchedId ? (
              <Action
                title="Disable This Target"
                icon={Icon.CircleDisabled}
                onAction={async () => {
                  try {
                    await api.updateTarget(matchedId, { enabled: false });
                    await showHUD(`Disabled ${matchedPattern}`);
                    await revalidate();
                  } catch (updateError) {
                    await reportFailure(updateError, "Couldn't disable the target");
                  }
                }}
              />
            ) : null}
            {matchedPattern ? (
              <Action
                title="Reveal Target in Proxy Manager"
                icon={Icon.AppWindow}
                onAction={() => revealTarget(matchedPattern)}
              />
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action title="Explain Another Host" icon={Icon.MagnifyingGlass} onAction={() => setManual(null)} />
            <Action
              title="Add Target…"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => goToCommand("add-target", { host: explanation.host })}
            />
            <Action.CopyToClipboard title="Copy Host" content={explanation.host} />
            <Action title="Open Proxy Manager" icon={Icon.AppWindow} onAction={() => openDashboard()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function HostForm({ onSubmit }: { onSubmit: (host: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <Form
      navigationTitle="Explain Host Routing"
      actions={
        <ActionPanel>
          <Action.SubmitForm<Values>
            title="Explain Routing"
            icon={Icon.QuestionMark}
            onSubmit={(values) => {
              const parsed = hostFromInput(values.host);
              if (!parsed) {
                setError("Enter a host or paste a URL");
                return;
              }
              setError(undefined);
              onSubmit(parsed);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="host"
        title="Host"
        placeholder="api.example.com or a URL"
        value={value}
        error={error}
        onChange={(next) => {
          setValue(next);
          setError(undefined);
        }}
      />
      <Form.Description text="Proxy Manager reports whether a target, a wildcard or a per-app rule decides the route. A host on the clipboard is used automatically." />
    </Form>
  );
}

function explanationMarkdown(explanation: Explanation, status: Status): string {
  // Raycast's markdown auto-links a bare domain even when escaped, so the host
  // goes in a code span; that keeps it plain text and reads as a literal host.
  const lines: string[] = [`# \`${explanation.host}\``, ""];

  if (status.state === "off" || status.state === "stopping") {
    lines.push("> Routing is off, so nothing is using the tunnel right now.", "");
  } else if (status.state === "degraded") {
    lines.push("> The tunnel is unreachable, so requests are failing right now.", "");
  }

  if (explanation.decision === "tunnel") {
    lines.push("## Through the tunnel", "");
    if (explanation.matchedPattern) {
      lines.push(
        `Matched the target \`${explanation.matchedPattern}\`, so requests for this host are forwarded to the SOCKS5 tunnel.`,
      );
    } else {
      lines.push("A per-app rule sends this app's traffic through the tunnel.");
    }
  } else {
    lines.push("## Direct", "");
    if (explanation.matchedPattern) {
      lines.push(`The target \`${explanation.matchedPattern}\` matches, but a per-app rule bypasses the tunnel.`);
    } else {
      lines.push("No target matches this host, so requests leave without the tunnel.");
      if (explanation.appMode === "DIRECT") {
        lines.push(
          "",
          "Per-app routing sends this app direct, so adding a target would not change this host. Change the app's mode in App Routing first.",
        );
      }
    }
  }

  lines.push("");
  if (explanation.appMode) {
    lines.push(`Per-app routing default: **${modeLabel(explanation.appMode)}**.`);
  } else {
    lines.push("Per-app routing is off, so the target list alone decides.");
  }

  return lines.join("\n");
}
