import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showHUD,
  showToast,
  updateCommandMetadata,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { isAgentInstalled, readRules, syncAgent, uninstallAgent, writeRules, type Rule } from "./lib/agent";
import { type Display, listDisplays } from "./lib/hdrctl";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sameDisplay(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function ruleFor(rules: Rule[], displayName: string): Rule | undefined {
  return rules.find((rule) => sameDisplay(rule.display, displayName));
}

function autoApplySubtitle(rules: Rule[], agentInstalled: boolean | undefined): string {
  if (rules.length === 0) return "Auto-apply: off";
  if (agentInstalled === false) return "Auto-apply: watcher not running";

  if (rules.length === 1) {
    const rule = rules[0];
    return `Auto-apply: HDR ${rule.hdr ? "on" : "off"} — ${rule.display}`;
  }

  return `Auto-apply: ${rules.length} displays`;
}

export default function HdrOnConnectCommand() {
  const {
    data: displays,
    isLoading,
    error: displaysError,
    revalidate: revalidateDisplays,
  } = useCachedPromise(listDisplays);
  const { data: rulesFile, revalidate: revalidateRules } = useCachedPromise(readRules);
  const { data: agentInstalled, revalidate: revalidateAgent } = useCachedPromise(isAgentInstalled);

  const rules = rulesFile?.rules ?? [];
  const subtitle = rulesFile === undefined ? undefined : autoApplySubtitle(rules, agentInstalled);

  // Root-search label: says whether auto-apply is armed, without opening the view.
  useEffect(() => {
    if (subtitle === undefined) return;
    void updateCommandMetadata({ subtitle }).catch(() => undefined);
  }, [subtitle]);

  function refreshAll(): void {
    revalidateDisplays();
    revalidateRules();
    revalidateAgent();
  }

  async function setRule(display: Display, hdr: boolean): Promise<void> {
    try {
      const current = await readRules();
      const next = current.rules.filter((rule) => !sameDisplay(rule.display, display.name));
      next.push({ display: display.name, hdr });
      await writeRules(next);
      await syncAgent();
      await showHUD(`HDR ${hdr ? "on" : "off"} when ${display.name} connects`);
      refreshAll();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't set HDR on connect",
        message: errorMessage(error),
      });
      refreshAll();
    }
  }

  async function removeRule(display: Display): Promise<void> {
    try {
      const current = await readRules();
      await writeRules(current.rules.filter((rule) => !sameDisplay(rule.display, display.name)));
      await syncAgent();
      await showHUD(`Removed the HDR rule for ${display.name}`);
      refreshAll();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't remove the rule",
        message: errorMessage(error),
      });
      refreshAll();
    }
  }

  async function removeWatcher(): Promise<void> {
    try {
      await writeRules([]);
      await uninstallAgent();
      await showHUD("Watcher removed. HDR on Connect is off.");
      refreshAll();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't remove the watcher",
        message: errorMessage(error),
      });
      refreshAll();
    }
  }

  const showError = Boolean(displaysError) && (displays?.length ?? 0) === 0;
  const showEmpty = !showError && !isLoading && (displays?.length ?? 0) === 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search displays">
      {showError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Read Displays"
          description={errorMessage(displaysError)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refreshAll} />
            </ActionPanel>
          }
        />
      ) : showEmpty ? (
        <List.EmptyView
          icon={Icon.Monitor}
          title="No Displays Found"
          description="Connect a display, then refresh."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshAll} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Displays"
          subtitle="Rules apply when a display connects. The watcher is opt-in and uses no CPU while idle."
        >
          {(displays ?? []).map((display) => {
            const rule = ruleFor(rules, display.name);
            const canRule = display.hdrCapable && !display.builtin;

            const accessories: List.Item.Accessory[] = [
              {
                tag: {
                  value: display.hdr ? "HDR On" : "HDR Off",
                  color: display.hdr ? Color.Blue : Color.SecondaryText,
                },
              },
            ];
            if (rule) {
              accessories.push({
                tag: {
                  value: `On connect: ${rule.hdr ? "On" : "Off"}`,
                  color: rule.hdr ? Color.Green : Color.Orange,
                },
              });
            }

            return (
              <List.Item
                key={display.id}
                icon={{
                  source: display.builtin ? Icon.Desktop : Icon.Monitor,
                  tintColor: display.hdr ? Color.Blue : Color.SecondaryText,
                }}
                title={display.name}
                subtitle={display.builtin ? "Built-in" : display.hdrCapable ? "HDR capable" : "No HDR support"}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    {canRule ? (
                      <>
                        <Action
                          title="Apply HDR on When Connected"
                          icon={Icon.Checkmark}
                          onAction={() => void setRule(display, true)}
                        />
                        <Action
                          title="Apply HDR off When Connected"
                          icon={Icon.Circle}
                          onAction={() => void setRule(display, false)}
                        />
                        {rule ? (
                          <Action
                            title="Remove Rule"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={() => void removeRule(display)}
                          />
                        ) : null}
                      </>
                    ) : null}
                    {agentInstalled ? (
                      <Action
                        title="Remove Watcher Agent"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => void removeWatcher()}
                      />
                    ) : null}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={refreshAll}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
