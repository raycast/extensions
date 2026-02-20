import { randomUUID } from "node:crypto";
import { Form, Action, ActionPanel, showToast, Toast, useNavigation } from "@raycast/api";
import { AppGroup } from "./types";
import { loadGroups, saveGroups } from "./storage";

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

  async function handleSubmit(values: {
    name: string;
    description: string;
    icon: string;
    startShortcut: string;
    quitShortcut: string;
  }) {
    if (!values.name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }

    const groups = await loadGroups();

    if (group) {
      const idx = groups.findIndex((g) => g.id === group.id);
      if (idx !== -1) {
        groups[idx] = {
          ...groups[idx],
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          icon: values.icon.trim() || "🚀",
          startShortcut: values.startShortcut.trim() || undefined,
          quitShortcut: values.quitShortcut.trim() || undefined,
        };
      }
      await saveGroups(groups);
      await showToast({ style: Toast.Style.Success, title: "Group updated" });
    } else {
      const newGroup: AppGroup = {
        id: randomUUID(),
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        icon: values.icon.trim() || "🚀",
        apps: [],
        startShortcut: values.startShortcut.trim() || undefined,
        quitShortcut: values.quitShortcut.trim() || undefined,
      };
      groups.push(newGroup);
      await saveGroups(groups);
      await showToast({ style: Toast.Style.Success, title: "Group created" });
    }

    revalidate();
    pop();
  }

  return (
    <Form
      navigationTitle={group ? "Edit Group" : "Create Group"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={group ? "Save Changes" : "Create Group"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Workspace"
        info="A name for this app group, shown in the launch and quit commands"
        defaultValue={group?.name ?? ""}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="e.g. Apps I use for daily work"
        info="An optional description shown below the group name"
        defaultValue={group?.description ?? ""}
      />
      <Form.Dropdown
        id="icon"
        title="Icon"
        info="An icon to identify this group at a glance"
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
      <Form.TextField
        id="startShortcut"
        title="Start Shortcut"
        placeholder="e.g. Start My Focus"
        info="Name of an Apple Shortcut to run when launching this group"
        defaultValue={group?.startShortcut ?? ""}
      />
      <Form.TextField
        id="quitShortcut"
        title="Quit Shortcut"
        placeholder="e.g. End My Focus"
        info="Name of an Apple Shortcut to run when quitting this group"
        defaultValue={group?.quitShortcut ?? ""}
      />
    </Form>
  );
}
