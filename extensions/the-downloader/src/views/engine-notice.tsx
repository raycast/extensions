import { ReactNode, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, open, openCommandPreferences, showToast } from "@raycast/api";
import { ENGINE_TITLES, EngineId, EnginePreference, EngineSettings } from "../lib/ai-engines.js";
import { EngineStatus, automaticStatus, checkAllEngines, switchTarget } from "../lib/engine-status.js";

/** How often to look again while an engine is on its way (e.g. Apple's model downloading). */
const RECHECK_MS = 30_000;

/**
 * Every engine's status and the one for `preference` (Automatic picks the first
 * ready engine). Re-checks on a timer while the chosen engine is waiting for
 * something that fixes itself, and says so with a toast once it's ready.
 */
export function useEngineStatus(preference: EnginePreference, settings: EngineSettings) {
  const [statuses, setStatuses] = useState<EngineStatus[]>();
  const [checks, setChecks] = useState(0);
  const recheck = () => setChecks((n) => n + 1);

  useEffect(() => {
    let active = true;
    void checkAllEngines(settings).then((next) => {
      if (active) setStatuses(next);
    });
    return () => {
      active = false;
    };
  }, [checks, settings]);

  const status = statuses
    ? preference in ENGINE_TITLES
      ? statuses.find((s) => s.engine === preference)
      : automaticStatus(statuses)
    : undefined;

  const waiting = !!status && !status.ready && !!status.waiting;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(recheck, RECHECK_MS);
    return () => clearInterval(timer);
  }, [waiting]);

  const wasWaiting = useRef(false);
  useEffect(() => {
    if (!status) return;
    if (status.ready && wasWaiting.current) {
      void showToast({ style: Toast.Style.Success, title: `${ENGINE_TITLES[status.engine]} is ready` });
    }
    wasWaiting.current = !status.ready && !!status.waiting;
  }, [status?.ready, status?.engine]);

  return { status, statuses, recheck };
}

/**
 * The notice at the top of a list when the chosen engine can't answer yet: what's
 * going on in plain words, and actions that fix it. Renders nothing when ready.
 */
export function EngineNotice({
  status,
  statuses,
  onRetry,
  onSwitch,
  actions,
}: {
  status: EngineStatus | undefined;
  statuses: EngineStatus[] | undefined;
  onRetry: () => void;
  /** Switch the chat's engine; without it, "switch" fixes point to the preferences. */
  onSwitch?: (engine: EngineId) => void;
  /** Extra actions after the fixes (e.g. the screen's own). */
  actions?: ReactNode;
}) {
  if (!status || status.ready) return null;
  const target = statuses ? switchTarget(statuses, status.engine) : undefined;
  const icon = status.waiting
    ? { source: Icon.Clock, tintColor: Color.Orange }
    : { source: Icon.Warning, tintColor: Color.Yellow };

  const fixes = status.fixes.map((fix, i) => {
    switch (fix.type) {
      case "open-url":
        return (
          <Action
            key={i}
            title={fix.title}
            icon={fix.url.startsWith("x-apple") ? Icon.Gear : Icon.Globe}
            onAction={() => open(fix.url)}
          />
        );
      case "copy":
        return <Action.CopyToClipboard key={i} title={fix.title} content={fix.text} />;
      case "preferences":
        return <Action key={i} title="Open Chat Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />;
      case "retry":
        return <Action key={i} title="Check Again" icon={Icon.ArrowClockwise} onAction={onRetry} />;
      case "switch":
        if (!target) return null;
        return onSwitch ? (
          <Action key={i} title={`Use ${ENGINE_TITLES[target]}`} icon={Icon.Switch} onAction={() => onSwitch(target)} />
        ) : (
          <Action
            key={i}
            title={`Choose ${ENGINE_TITLES[target]} in Preferences`}
            icon={Icon.Switch}
            onAction={openCommandPreferences}
          />
        );
    }
  });

  const hint = target ? `\n\n${ENGINE_TITLES[target]} is ready if you'd rather not wait.` : "";
  return (
    <List.Section title="AI Engine">
      <List.Item
        id="engine-notice"
        title={status.title}
        icon={icon}
        detail={<List.Item.Detail markdown={`## ${status.title}\n\n${status.message}${hint}`} />}
        actions={
          <ActionPanel>
            {fixes}
            {actions}
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
