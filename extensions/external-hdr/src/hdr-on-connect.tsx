import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { type Display, listDisplays, setHdr } from "./hdr";
import { type Rule, readRules, readSeen, writeRules, writeSeen } from "./lib/rules";

function autoApplySubtitle(rules: Rule[]): string {
  if (rules.length === 0) return "Auto-apply: off";
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

  const rules = rulesFile?.rules ?? [];
  const subtitle = rulesFile === undefined ? undefined : autoApplySubtitle(rules);

  // Root-search label: says whether auto-apply is armed, without opening the view.
  useEffect(() => {
    if (subtitle === undefined) return;
    void updateCommandMetadata({ subtitle }).catch(() => undefined);
  }, [subtitle]);

  function refreshAll(): void {
    void revalidateDisplays();
    void revalidateRules();
  }

  async function setRule(display: Display, hdr: boolean): Promise<void> {
    try {
      const current = await readRules();
      const next = current.rules.filter((rule) => rule.uuid !== display.uuid);
      next.push({ uuid: display.uuid, display: display.name, hdr });
      await writeRules(next);

      // Apply unconditionally: the view's snapshot may be stale if HDR changed
      // in System Settings while this screen stayed open.
      await setHdr(display.id, hdr ? "on" : "off");

      // Mark only this display as handled. Writing the whole connected list
      // would swallow another monitor's pending rule or failed retry.
      const seen = await readSeen();
      const entries = new Map((seen ?? []).map((entry) => [entry.uuid, entry.id]));
      entries.set(display.uuid, display.id);
      await writeSeen([...entries].map(([uuid, id]) => ({ uuid, id })));

      await showHUD(`HDR ${hdr ? "on" : "off"} when ${display.name} connects`);
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't set HDR on connect" });
    } finally {
      refreshAll();
    }
  }

  async function removeRule(rule: Rule): Promise<void> {
    try {
      const current = await readRules();
      await writeRules(current.rules.filter((candidate) => candidate.uuid !== rule.uuid));
      await showHUD(`Removed the HDR rule for ${rule.display}`);
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't remove the rule" });
    } finally {
      refreshAll();
    }
  }

  async function clearRules(): Promise<void> {
    const confirmed = await confirmAlert({
      title: "Clear all HDR rules?",
      message: "Every display rule will be deleted. This cannot be undone.",
      primaryAction: { title: "Clear All Rules", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await writeRules([]);
      await showHUD("Cleared all HDR auto-apply rules");
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't clear the rules" });
    } finally {
      refreshAll();
    }
  }

  const connectedUuids = new Set((displays ?? []).map((display) => display.uuid));
  const ruleableDisplays = (displays ?? []).filter((display) => !display.builtin && display.hdrCapable);
  const savedRules = rules.filter((rule) => !connectedUuids.has(rule.uuid));

  const showError = Boolean(displaysError) && (displays?.length ?? 0) === 0;
  const showEmpty = !showError && !isLoading && ruleableDisplays.length === 0 && savedRules.length === 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search displays">
      {showError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Read Displays"
          description={displaysError instanceof Error ? displaysError.message : String(displaysError)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refreshAll} />
              <Action
                title="Clear All Rules"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void clearRules()}
              />
            </ActionPanel>
          }
        />
      ) : showEmpty ? (
        <List.EmptyView
          icon={Icon.Monitor}
          title={displays && displays.length > 0 ? "No HDR-Capable Displays" : "No Displays Found"}
          description={
            displays && displays.length > 0
              ? "Connect an external HDR-capable display, then refresh."
              : "Connect a display, then refresh."
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshAll} />
              <Action
                title="Clear All Rules"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void clearRules()}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {ruleableDisplays.length > 0 ? (
            <List.Section
              title="Displays"
              subtitle="Rules apply when a display connects. Press ⌘R after connecting or disconnecting a display."
            >
              {ruleableDisplays.map((display) => {
                const rule = rules.find((candidate) => candidate.uuid === display.uuid);

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
                    key={display.uuid}
                    icon={{
                      source: Icon.Monitor,
                      tintColor: display.hdr ? Color.Blue : Color.SecondaryText,
                    }}
                    title={display.name}
                    subtitle="HDR capable"
                    accessories={accessories}
                    actions={
                      <ActionPanel>
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
                            onAction={() => void removeRule(rule)}
                          />
                        ) : null}
                        <Action
                          title="Clear All Rules"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => void clearRules()}
                        />
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
          ) : null}

          {savedRules.length > 0 ? (
            <List.Section title="Saved Rules" subtitle="Rules whose display is not connected right now.">
              {savedRules.map((rule) => (
                <List.Item
                  key={rule.uuid}
                  icon={{ source: Icon.Monitor, tintColor: Color.SecondaryText }}
                  title={rule.display}
                  subtitle="Not connected"
                  accessories={[
                    {
                      tag: {
                        value: `On connect: ${rule.hdr ? "On" : "Off"}`,
                        color: rule.hdr ? Color.Green : Color.Orange,
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Remove Rule"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => void removeRule(rule)}
                      />
                      <Action
                        title="Clear All Rules"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => void clearRules()}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={refreshAll}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}
