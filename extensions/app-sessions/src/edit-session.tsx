import { randomUUID } from "node:crypto";
import { Form, Action, ActionPanel, getApplications, showToast, Toast, useNavigation } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";
import { AppGroup, RaycastCommandStep, StoredApp } from "./types";
import { loadGroups, saveGroups } from "./storage";
import { listAppleShortcuts } from "./apple-shortcuts";
import { NO_SHORTCUT, normalizeShortcutValue } from "./shortcut-values";
import { parseRaycastCommandDeeplink } from "./raycast-commands";

interface Props {
  group?: AppGroup;
  revalidate: () => void;
}

const ICON_SECTIONS = [
  {
    title: "Work",
    icons: [
      { emoji: "💼", label: "Briefcase" },
      { emoji: "💻", label: "Laptop" },
      { emoji: "📊", label: "Chart" },
      { emoji: "📝", label: "Notes" },
      { emoji: "📧", label: "Email" },
      { emoji: "📅", label: "Calendar" },
      { emoji: "📎", label: "Paperclip" },
      { emoji: "🏢", label: "Office" },
    ],
  },
  {
    title: "Development",
    icons: [
      { emoji: "🚀", label: "Rocket" },
      { emoji: "⚡", label: "Lightning" },
      { emoji: "🔧", label: "Wrench" },
      { emoji: "🛠️", label: "Tools" },
      { emoji: "🧪", label: "Lab" },
      { emoji: "🐛", label: "Bug" },
      { emoji: "🤖", label: "Robot" },
      { emoji: "⚙️", label: "Gear" },
    ],
  },
  {
    title: "Creative",
    icons: [
      { emoji: "🎨", label: "Art" },
      { emoji: "✏️", label: "Pencil" },
      { emoji: "📷", label: "Camera" },
      { emoji: "🎬", label: "Film" },
      { emoji: "🎵", label: "Music" },
      { emoji: "🎤", label: "Microphone" },
      { emoji: "🖌️", label: "Paintbrush" },
      { emoji: "✨", label: "Sparkles" },
    ],
  },
  {
    title: "Communication",
    icons: [
      { emoji: "💬", label: "Chat" },
      { emoji: "🌐", label: "Globe" },
      { emoji: "📱", label: "Phone" },
      { emoji: "📞", label: "Telephone" },
      { emoji: "🔔", label: "Bell" },
      { emoji: "📢", label: "Megaphone" },
    ],
  },
  {
    title: "Lifestyle",
    icons: [
      { emoji: "🏠", label: "Home" },
      { emoji: "☕", label: "Coffee" },
      { emoji: "🎮", label: "Gaming" },
      { emoji: "📚", label: "Books" },
      { emoji: "🏋️", label: "Fitness" },
      { emoji: "🎯", label: "Target" },
      { emoji: "🌙", label: "Moon" },
      { emoji: "☀️", label: "Sun" },
    ],
  },
  {
    title: "Symbols",
    icons: [
      { emoji: "⭐", label: "Star" },
      { emoji: "❤️", label: "Heart" },
      { emoji: "🔥", label: "Fire" },
      { emoji: "💎", label: "Gem" },
      { emoji: "🎪", label: "Circus" },
      { emoji: "🌈", label: "Rainbow" },
      { emoji: "🍀", label: "Clover" },
      { emoji: "🔮", label: "Crystal Ball" },
    ],
  },
];

export function EditGroupForm({ group, revalidate }: Props) {
  const { pop } = useNavigation();
  const [shortcuts, setShortcuts] = useState<string[]>([]);
  const [apps, setApps] = useState<StoredApp[]>(group?.apps ?? []);
  const [startCommandRows, setStartCommandRows] = useState<RaycastCommandStep[]>(() => [
    ...(group?.afterStartCommands ?? []),
    emptyCommand(),
  ]);
  const [endCommandRows, setEndCommandRows] = useState<RaycastCommandStep[]>(() => [
    ...(group?.afterEndCommands ?? []),
    emptyCommand(),
  ]);
  const [isLoadingShortcuts, setIsLoadingShortcuts] = useState(true);
  const [shortcutListFailed, setShortcutListFailed] = useState(false);
  const startShortcut = normalizeShortcutValue(group?.startShortcut);
  const quitShortcut = normalizeShortcutValue(group?.quitShortcut);
  const shortcutOptions = uniqueShortcuts(shortcuts, startShortcut, quitShortcut);

  useEffect(() => {
    listAppleShortcuts()
      .then((availableShortcuts) => {
        setShortcuts(availableShortcuts);
        setShortcutListFailed(false);
      })
      .catch(() => {
        setShortcutListFailed(true);
      })
      .finally(() => {
        setIsLoadingShortcuts(false);
      });

    getApplications()
      .then((installedApps) => {
        const byBundleId = new Map(
          [...(group?.apps ?? []), ...installedApps]
            .filter((app) => app.bundleId)
            .map((app) => [app.bundleId!, { name: app.name, bundleId: app.bundleId!, path: app.path }]),
        );
        setApps([...byBundleId.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => undefined);
  }, []);

  function updateCommand(
    setRows: React.Dispatch<React.SetStateAction<RaycastCommandStep[]>>,
    id: string,
    change: Partial<RaycastCommandStep>,
  ) {
    setRows((rows) => {
      const next = rows.map((row) => (row.id === id ? { ...row, ...change } : row));
      return next.at(-1)?.deeplink.trim() ? [...next, emptyCommand()] : next;
    });
  }

  async function handleSubmit(values: {
    name: string;
    description: string;
    icon: string;
    apps: string[];
    startShortcut: unknown;
    quitShortcut: unknown;
  }) {
    if (!values.name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }

    const afterStartCommands = configuredCommands(startCommandRows);
    const afterEndCommands = configuredCommands(endCommandRows);
    const invalidCommand = [...afterStartCommands, ...afterEndCommands].find(
      (command) => !parseRaycastCommandDeeplink(command.deeplink),
    );
    if (invalidCommand) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Raycast Deeplink",
        message: invalidCommand.deeplink,
      });
      return;
    }

    const selectedApps = apps.filter((app) => values.apps.includes(app.bundleId));

    const groups = await loadGroups();

    if (group) {
      const idx = groups.findIndex((g) => g.id === group.id);
      if (idx !== -1) {
        groups[idx] = {
          ...groups[idx],
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          icon: values.icon.trim() || "🚀",
          apps: selectedApps,
          startShortcut: normalizeShortcutValue(values.startShortcut),
          quitShortcut: normalizeShortcutValue(values.quitShortcut),
          afterStartCommands,
          afterEndCommands,
        };
      }
      await saveGroups(groups);
      await showToast({ style: Toast.Style.Success, title: "Session updated" });
    } else {
      const newGroup: AppGroup = {
        id: randomUUID(),
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        icon: values.icon.trim() || "🚀",
        apps: selectedApps,
        startShortcut: normalizeShortcutValue(values.startShortcut),
        quitShortcut: normalizeShortcutValue(values.quitShortcut),
        afterStartCommands,
        afterEndCommands,
      };
      groups.push(newGroup);
      await saveGroups(groups);
      await showToast({ style: Toast.Style.Success, title: "Session created" });
    }

    revalidate();
    pop();
  }

  return (
    <Form
      navigationTitle={group ? "Edit Session" : "Create Session"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={group ? "Save Changes" : "Create Session"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Workspace"
        info="A name shown in the start and end commands"
        defaultValue={group?.name ?? ""}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="e.g. Apps I use for daily work"
        info="An optional description shown below the session name"
        defaultValue={group?.description ?? ""}
      />
      <Form.Dropdown
        id="icon"
        title="Icon"
        info="An icon to identify this session at a glance"
        defaultValue={group?.icon ?? "🚀"}
      >
        {ICON_SECTIONS.map((section) => (
          <Form.Dropdown.Section key={section.title} title={section.title}>
            {section.icons.map(({ emoji, label }) => (
              <Form.Dropdown.Item key={emoji} value={emoji} title={`${emoji}  ${label}`} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TagPicker
        id="apps"
        title="Apps"
        info="Apps to open when starting and quit when ending this session"
        defaultValue={group?.apps.map((app) => app.bundleId) ?? []}
      >
        {apps.map((app) => (
          <Form.TagPicker.Item key={app.bundleId} value={app.bundleId} title={app.name} icon={{ fileIcon: app.path }} />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      {shortcutListFailed ? (
        <>
          <Form.TextField
            id="startShortcut"
            title="Start Shortcut"
            placeholder="e.g. Turn Work On"
            info="Name of an Apple Shortcut to run when starting this session"
            defaultValue={startShortcut ?? ""}
          />
          <Form.TextField
            id="quitShortcut"
            title="End Shortcut"
            placeholder="e.g. Turn Work Off"
            info="Name of an Apple Shortcut to run when ending this session"
            defaultValue={quitShortcut ?? ""}
          />
        </>
      ) : (
        <>
          <Form.Dropdown
            id="startShortcut"
            title="Start Shortcut"
            info="Apple Shortcut to run when starting this session"
            defaultValue={startShortcut ?? NO_SHORTCUT}
            isLoading={isLoadingShortcuts}
          >
            <Form.Dropdown.Item value={NO_SHORTCUT} title="None" />
            {shortcutOptions.map((shortcut) => (
              <Form.Dropdown.Item key={shortcut} value={shortcut} title={shortcut} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="quitShortcut"
            title="End Shortcut"
            info="Apple Shortcut to run when ending this session"
            defaultValue={quitShortcut ?? NO_SHORTCUT}
            isLoading={isLoadingShortcuts}
          >
            <Form.Dropdown.Item value={NO_SHORTCUT} title="None" />
            {shortcutOptions.map((shortcut) => (
              <Form.Dropdown.Item key={shortcut} value={shortcut} title={shortcut} />
            ))}
          </Form.Dropdown>
        </>
      )}
      <Form.Separator />
      <Form.Description
        title="After Start Commands"
        text="Paste command deeplinks copied from Raycast with ⌘⇧C. Commands run in order after the Start Shortcut; clear a field to remove it."
      />
      {startCommandRows.map((command, index) => (
        <Fragment key={command.id}>
          <Form.TextField
            id={`command-${command.id}`}
            title={`Command ${index + 1}`}
            placeholder="raycast://extensions/owner/extension/command"
            value={command.deeplink}
            onChange={(deeplink) => updateCommand(setStartCommandRows, command.id, { deeplink })}
          />
          <Form.Dropdown
            id={`wait-${command.id}`}
            title="Wait Before"
            value={String(command.waitBeforeMs)}
            onChange={(waitBeforeMs) =>
              updateCommand(setStartCommandRows, command.id, { waitBeforeMs: Number(waitBeforeMs) })
            }
          >
            <Form.Dropdown.Item value="0" title="None" />
            <Form.Dropdown.Item value="1000" title="1 second" />
            <Form.Dropdown.Item value="2000" title="2 seconds" />
            <Form.Dropdown.Item value="5000" title="5 seconds" />
            <Form.Dropdown.Item value="10000" title="10 seconds" />
            <Form.Dropdown.Item value="30000" title="30 seconds" />
          </Form.Dropdown>
        </Fragment>
      ))}
      <Form.Separator />
      <Form.Description
        title="After End Commands"
        text="Paste command deeplinks copied from Raycast with ⌘⇧C. Commands run in order after the End Shortcut; clear a field to remove it."
      />
      {endCommandRows.map((command, index) => (
        <Fragment key={command.id}>
          <Form.TextField
            id={`end-command-${command.id}`}
            title={`Command ${index + 1}`}
            placeholder="raycast://extensions/owner/extension/command"
            value={command.deeplink}
            onChange={(deeplink) => updateCommand(setEndCommandRows, command.id, { deeplink })}
          />
          <Form.Dropdown
            id={`end-wait-${command.id}`}
            title="Wait Before"
            value={String(command.waitBeforeMs)}
            onChange={(waitBeforeMs) =>
              updateCommand(setEndCommandRows, command.id, { waitBeforeMs: Number(waitBeforeMs) })
            }
          >
            <Form.Dropdown.Item value="0" title="None" />
            <Form.Dropdown.Item value="1000" title="1 second" />
            <Form.Dropdown.Item value="2000" title="2 seconds" />
            <Form.Dropdown.Item value="5000" title="5 seconds" />
            <Form.Dropdown.Item value="10000" title="10 seconds" />
            <Form.Dropdown.Item value="30000" title="30 seconds" />
          </Form.Dropdown>
        </Fragment>
      ))}
    </Form>
  );
}

function uniqueShortcuts(shortcuts: string[], ...selectedShortcuts: Array<string | undefined>): string[] {
  return Array.from(
    new Set([...selectedShortcuts.filter((shortcut): shortcut is string => Boolean(shortcut)), ...shortcuts]),
  );
}

function emptyCommand(): RaycastCommandStep {
  return { id: randomUUID(), deeplink: "", waitBeforeMs: 0 };
}

function configuredCommands(rows: RaycastCommandStep[]): RaycastCommandStep[] {
  return rows
    .filter((command) => command.deeplink.trim())
    .map((command) => ({ ...command, deeplink: command.deeplink.trim() }));
}
