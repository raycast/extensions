import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";
import { createDeeplink, useCachedPromise } from "@raycast/utils";
import { CommandForm } from "./components/CommandForm";
import { ImportForm } from "./components/ImportForm";
import { iconFor } from "./components/icons";
import { RunView } from "./components/RunView";
import { resolveModel } from "./lib/ai";
import { deleteCommand, getCommand, loadCommands, resetPreset, restorePresets } from "./lib/store";
import { PRESETS } from "./lib/presets";
import { MODE_LABEL, PROVIDER_LABEL, type AICommand } from "./lib/types";

const PRESET_COUNT = PRESETS.length;

/**
 * The list, or, when launched from a quicklink/deeplink with {"id": "..."} in
 * the context, that one command straight away. One root entry, any hotkey.
 */
export default function Command(props: LaunchProps<{ launchContext?: { id?: string } }>) {
  const id = props.launchContext?.id;
  if (id) return <Direct id={id} />;
  return <CommandList />;
}

function Direct({ id }: { id: string }) {
  const { data, isLoading } = useCachedPromise(getCommand, [id]);
  if (isLoading) return <Detail isLoading markdown="" />;
  if (!data)
    return (
      <Detail
        markdown={`## Command not found\n\nNo AI command with id \`${id}\`. Recreate the quicklink from **Search AI Commands**.`}
      />
    );
  return <RunView command={data} />;
}

function CommandList() {
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = useCachedPromise(loadCommands, [], { keepPreviousData: true });
  const commands = data ?? [];
  const mine = commands.filter((c) => !c.preset);
  const presets = commands.filter((c) => c.preset);

  const remove = async (cmd: AICommand) => {
    const ok = await confirmAlert({
      title: `Delete “${cmd.title}”?`,
      message: cmd.preset ? "You can bring it back later with Restore Presets." : "This cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await deleteCommand(cmd.id);
    await showToast({ style: Toast.Style.Success, title: "Deleted", message: cmd.title });
    revalidate();
  };

  const restore = async () => {
    const n = await restorePresets();
    await showToast({
      style: Toast.Style.Success,
      title: n ? `Restored ${n} preset${n === 1 ? "" : "s"}` : "All presets are already here",
    });
    revalidate();
  };

  const item = (cmd: AICommand) => (
    <List.Item
      key={cmd.id}
      icon={iconFor(cmd.icon)}
      title={cmd.title}
      subtitle={firstLine(cmd.prompt)}
      accessories={[
        { tag: PROVIDER_LABEL[cmd.provider], tooltip: resolveModel(cmd) },
        { icon: modeIcon(cmd), tooltip: MODE_LABEL[cmd.mode] },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Run on Selected Text" icon={Icon.Play} onAction={() => push(<RunView command={cmd} />)} />
            <Action
              title="Edit Command"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => push(<CommandForm command={cmd} onSaved={revalidate} />)}
            />
            <Action
              title="Duplicate Command"
              icon={Icon.Duplicate}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              onAction={() => push(<CommandForm template={cmd} onSaved={revalidate} />)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CreateQuicklink
              title="Create Quicklink for Hotkey"
              icon={Icon.Keyboard}
              quicklink={{
                name: cmd.title,
                link: createDeeplink({ command: "search-commands", context: { id: cmd.id } }),
              }}
            />
            <Action.CopyToClipboard title="Copy Prompt" content={cmd.prompt} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="New Command"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => push(<CommandForm onSaved={revalidate} />)}
            />
            <Action
              title="Import from Raycast Export"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={() => push(<ImportForm onDone={revalidate} />)}
            />
            {presets.length < PRESET_COUNT && <Action title="Restore Presets" icon={Icon.Undo} onAction={restore} />}
            {cmd.preset && (
              <Action
                title="Reset to Default"
                icon={Icon.ArrowCounterClockwise}
                onAction={async () => {
                  await resetPreset(cmd.id);
                  await showToast({ style: Toast.Style.Success, title: "Reset", message: cmd.title });
                  revalidate();
                }}
              />
            )}
            <Action
              title="Delete Command"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => remove(cmd)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search AI commands…">
      <List.EmptyView
        icon={Icon.Wand}
        title="No commands yet"
        description="Press ⌘N to create your first AI command."
        actions={
          <ActionPanel>
            <Action title="New Command" icon={Icon.Plus} onAction={() => push(<CommandForm onSaved={revalidate} />)} />
            <Action
              title="Import from Raycast Export"
              icon={Icon.Download}
              onAction={() => push(<ImportForm onDone={revalidate} />)}
            />
            <Action title="Restore Presets" icon={Icon.Undo} onAction={restore} />
          </ActionPanel>
        }
      />
      {mine.length > 0 && (
        <List.Section title="Your Commands" subtitle={`${mine.length}`}>
          {mine.map(item)}
        </List.Section>
      )}
      {presets.length > 0 && (
        <List.Section title="Presets" subtitle={`${presets.length}`}>
          {presets.map(item)}
        </List.Section>
      )}
    </List>
  );
}

function firstLine(prompt: string): string {
  const line = prompt.split("\n").find((l) => l.trim()) ?? "";
  return line.length > 80 ? `${line.slice(0, 77)}…` : line;
}

function modeIcon(cmd: AICommand): Icon {
  return cmd.mode === "paste" ? Icon.Replace : cmd.mode === "copy" ? Icon.Clipboard : Icon.Eye;
}
