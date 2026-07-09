/* eslint-disable @raycast/prefer-title-case -- action titles use keys (Ctrl+Number) */
import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getActiveSpaceId, listSpaces, mainDisplay } from "./lib/native";
import { switchToSpace } from "./lib/spaceSwitch";
import { ensureSwitchDefaults, setUpSwitching } from "./lib/desktopShortcuts";
import { clearSpaceName, getSpaceConfig, MODIFIER_OPTIONS, nameForId, setSpaceConfig } from "./lib/spaceNames";
import { SpaceInfo } from "./lib/format";

export default function Command() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [activeId, setActiveId] = useState<number | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const focusedInitial = useRef(false);

  async function reload() {
    try {
      ensureSwitchDefaults(); // apply default key codes + enable system shortcuts (once)
      const list = listSpaces(true)
        .filter((s) => s.display === mainDisplay())
        .slice(0, 11);
      let active: number | undefined;
      try {
        active = getActiveSpaceId();
      } catch {
        active = undefined;
      }
      setSpaces(list);
      setActiveId(active);
      // Focus the current space the first time the list loads. We do this on a
      // short timeout — after the items have rendered — so Raycast scrolls the
      // selection into view even when the current space is near the bottom.
      // Afterwards we leave the selection wherever the user has navigated to.
      if (!focusedInitial.current && active != null) {
        focusedInitial.current = true;
        setTimeout(() => setSelectedId(String(active)), 100);
      }
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <List isLoading={loading} selectedItemId={selectedId} onSelectionChange={(id) => setSelectedId(id ?? undefined)}>
      {error && <List.EmptyView icon={Icon.Warning} title="Could not read spaces" description={error} />}
      {spaces.map((space) => {
        const custom = nameForId(space.id);
        const cfg = getSpaceConfig(space.id);
        const hasShortcut = !!cfg?.keyCode;
        const accessories: List.Item.Accessory[] = [];
        if (space.id === activeId) accessories.push({ tag: { value: "Current", color: Color.Green } });
        if (hasShortcut) accessories.push({ icon: Icon.Keyboard, tooltip: "Switch shortcut configured" });
        return (
          <List.Item
            key={space.id}
            id={String(space.id)}
            icon={space.id === activeId ? { source: Icon.Desktop, tintColor: Color.Green } : Icon.Desktop}
            title={custom ?? `Space ${space.index}`}
            subtitle={custom ? `Space ${space.index}` : undefined}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title="Go to Space"
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    if (space.id == null) return;
                    try {
                      await switchToSpace(space.id);
                      // Optimistically move the "current" marker, then reconcile
                      // once the OS switch has settled (the keystroke is async).
                      setActiveId(space.id);
                      setTimeout(() => {
                        void reload();
                      }, 500);
                    } catch (err) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Could not switch",
                        message: err instanceof Error ? err.message : String(err),
                      });
                    }
                  }}
                />
                <Action.Push
                  title="Edit Space"
                  icon={Icon.Pencil}
                  target={<SpaceForm space={space} onDone={reload} />}
                />
                {custom && (
                  <Action
                    title="Clear Name"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (space.id != null) clearSpaceName(space.id);
                      await reload();
                      await showToast({ style: Toast.Style.Success, title: "Name cleared" });
                    }}
                  />
                )}
                <Action
                  title="Set Up Ctrl+Number Switching"
                  icon={Icon.Keyboard}
                  onAction={async () => {
                    try {
                      const n = setUpSwitching(spaces);
                      await reload();
                      await showToast({
                        style: Toast.Style.Success,
                        title: `Enabled Ctrl+Number for ${n} space${n === 1 ? "" : "s"}`,
                        message: "Grant Raycast Accessibility on first switch",
                      });
                    } catch (err) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Setup failed",
                        message: err instanceof Error ? err.message : String(err),
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function SpaceForm({ space, onDone }: { space: SpaceInfo; onDone: () => Promise<void> }) {
  const { pop } = useNavigation();
  const cfg = getSpaceConfig(space.id);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (values: { name: string; keyCode: string; modifiers: string[] }) => {
              if (space.id != null) {
                setSpaceConfig(space.id, {
                  name: values.name,
                  keyCode: values.keyCode,
                  modifiers: values.modifiers,
                });
              }
              await onDone();
              await showToast({ style: Toast.Style.Success, title: "Space saved" });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Space ${space.index} · Display ${space.display}`} />
      <Form.TextField id="name" title="Name" placeholder="e.g. Work, Comms, Design" defaultValue={cfg?.name ?? ""} />
      <Form.Separator />
      <Form.Description
        title="Switch shortcut"
        text="To make 'Go to Space' work, enter the macOS keyboard shortcut that switches to this desktop (e.g. Control + the '1' key = keyCode 18). Enable these under System Settings › Keyboard › Keyboard Shortcuts › Mission Control, and grant Raycast Accessibility permission."
      />
      <Form.TextField
        id="keyCode"
        title="Key Code"
        placeholder="e.g. 18 for the '1' key"
        defaultValue={cfg?.keyCode ?? ""}
      />
      <Form.TagPicker id="modifiers" title="Modifiers" defaultValue={cfg?.modifiers ?? ["control down"]}>
        {MODIFIER_OPTIONS.map((m) => (
          <Form.TagPicker.Item key={m.value} value={m.value} title={m.title} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
