import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Form,
  open,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { Space, getSpaces } from "./utils";

export default function Command() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const spacesSnapshotRef = useRef<string | undefined>(undefined);

  const loadSpaces = () => {
    getSpaces()
      .then((nextSpaces) => {
        const nextSnapshot = JSON.stringify(nextSpaces);
        if (spacesSnapshotRef.current === nextSnapshot) return;
        spacesSnapshotRef.current = nextSnapshot;
        setSpaces(nextSpaces);
      })
      .catch((err: unknown) => {
        // JSON.parse throws SyntaxError when SpaceJump is mid-write of the
        // state file (1s poll + non-atomic write = routine race). Skip
        // silently and let the next poll retry. Only surface real errors.
        if (err instanceof SyntaxError) return;
        const message = err instanceof Error ? err.message : String(err);
        showToast({ style: Toast.Style.Failure, title: "SpaceJump not running", message });
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadSpaces();
    // Poll every second to pick up space changes
    const interval = setInterval(loadSpaces, 1000);
    return () => clearInterval(interval);
  }, []);

  // Group by display if multiple displays
  const displays = [...new Set(spaces.map((s) => s.displayIndex))].sort();
  const hasMultipleDisplays = displays.length > 1;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spaces...">
      {hasMultipleDisplays
        ? displays.map((displayIdx) => (
            <List.Section key={displayIdx} title={`Display ${displayIdx}`}>
              {spaces
                .filter((s) => s.displayIndex === displayIdx)
                .map((space) => (
                  <SpaceListItem key={space.id} space={space} />
                ))}
            </List.Section>
          ))
        : spaces.map((space) => <SpaceListItem key={space.id} space={space} />)}
    </List>
  );
}

function SpaceListItem({ space }: { space: Space }) {
  return (
    <List.Item
      icon={
        space.isCurrent
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.Dot, tintColor: space.colorHex }
      }
      title={space.name}
      subtitle={`Desktop ${space.index}`}
      accessories={space.isCurrent ? [{ tag: { value: "Current", color: Color.Green } }] : []}
      actions={
        <ActionPanel>
          <Action
            title="Switch to Space"
            icon={Icon.ArrowRight}
            onAction={async () => {
              await open(`spacejump://switch?name=${encodeURIComponent(space.name)}`);
            }}
          />
          <Action.Push
            title="Edit Space"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<EditSpaceForm space={space} />}
          />
          <Action.CopyToClipboard title="Copy Space Name" content={space.name} />
        </ActionPanel>
      }
    />
  );
}

const COLORS = [
  "Purple",
  "Blue",
  "Teal",
  "Green",
  "Yellow",
  "Orange",
  "Red",
  "Pink",
  "Indigo",
  "Cyan",
  "Mint",
  "Lime",
  "Amber",
  "Coral",
  "Rose",
  "Lavender",
  "Slate",
  "Charcoal",
];

const ICONS = [
  { value: "", title: "None" },
  { value: "emoji:💻", title: "💻 Laptop" },
  { value: "emoji:📧", title: "📧 Email" },
  { value: "emoji:🎨", title: "🎨 Design" },
  { value: "emoji:🔬", title: "🔬 Research" },
  { value: "emoji:📝", title: "📝 Notes" },
  { value: "emoji:🎵", title: "🎵 Music" },
  { value: "emoji:💬", title: "💬 Chat" },
  { value: "emoji:📊", title: "📊 Analytics" },
  { value: "emoji:🏠", title: "🏠 Home" },
  { value: "emoji:🎮", title: "🎮 Gaming" },
  { value: "emoji:📱", title: "📱 Mobile" },
  { value: "emoji:🌐", title: "🌐 Web" },
  { value: "emoji:⚙️", title: "⚙️ Settings" },
  { value: "emoji:📅", title: "📅 Calendar" },
  { value: "emoji:🎯", title: "🎯 Focus" },
];

function EditSpaceForm({ space }: { space: Space }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (values: { name: string; color: string; icon: string }) => {
              const newName = values.name.trim();
              if (newName && newName !== space.name) {
                await open(`spacejump://rename?space=${space.index}&name=${encodeURIComponent(newName)}`);
              }
              if (values.color !== String(space.colorIndex ?? 0)) {
                await open(`spacejump://setcolor?space=${space.index}&color=${values.color}`);
              }
              if (values.icon !== (space.icon ?? "")) {
                await open(`spacejump://seticon?space=${space.index}&icon=${encodeURIComponent(values.icon)}`);
              }
              await showToast({ style: Toast.Style.Success, title: "Space updated" });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={space.name} />
      <Form.Dropdown id="color" title="Color" defaultValue={String(space.colorIndex ?? 0)}>
        {COLORS.map((name, idx) => (
          <Form.Dropdown.Item key={idx} value={String(idx)} title={name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="icon" title="Icon" defaultValue={space.icon ?? ""}>
        {ICONS.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
