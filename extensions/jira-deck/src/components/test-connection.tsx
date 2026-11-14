import { Action, ActionPanel, Color, Icon, Image, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { CHECKS, CheckResult, CheckStatus, toResult } from "../lib/connection-check";

const TOKEN_URL = "https://id.atlassian.com/manage-profile/security/api-tokens";

const ICONS: Record<CheckStatus, Image.ImageLike> = {
  waiting: { source: Icon.Circle, tintColor: Color.SecondaryText },
  running: { source: Icon.CircleProgress, tintColor: Color.Blue },
  passed: { source: Icon.CheckCircle, tintColor: Color.Green },
  failed: { source: Icon.XMarkCircle, tintColor: Color.Red },
  skipped: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
  warning: { source: Icon.ExclamationMark, tintColor: Color.Yellow },
};

type Results = Record<string, CheckResult>;

const waiting = (): Results => Object.fromEntries(CHECKS.map((check) => [check.id, { status: "waiting" }]));

/** Checks the setup step by step. Opened from any action panel's Extension section, or when loading fails. */
export function TestConnection() {
  const [results, setResults] = useState<Results>(waiting);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const set = (id: string, result: CheckResult) => {
      if (!cancelled) setResults((current) => ({ ...current, [id]: result }));
    };

    (async () => {
      setResults(waiting());
      let failed = false;
      for (const check of CHECKS) {
        if (failed) {
          set(check.id, { status: "skipped", detail: "Fix the step above first" });
          continue;
        }
        set(check.id, { status: "running" });
        try {
          set(check.id, { status: "passed", detail: await check.run() });
        } catch (error) {
          const result = toResult(error);
          set(check.id, result);
          failed = result.status === "failed";
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [run]);

  const running = Object.values(results).some((result) => result.status === "running");
  const needsSetup = Object.values(results).some((result) => result.setup);

  const actions = (
    <ActionPanel>
      {needsSetup && <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />}
      <Action
        title="Test Again"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => setRun((count) => count + 1)}
      />
      {!needsSetup && (
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      )}
      <Action.OpenInBrowser title="Create API Token" url={TOKEN_URL} />
    </ActionPanel>
  );

  return (
    <List isLoading={running} navigationTitle="Test Connection">
      {CHECKS.map((check) => {
        const result = results[check.id];
        return (
          <List.Item
            key={check.id}
            icon={ICONS[result.status]}
            title={check.title}
            subtitle={{ value: result.detail, tooltip: result.detail }}
            actions={actions}
          />
        );
      })}
    </List>
  );
}
