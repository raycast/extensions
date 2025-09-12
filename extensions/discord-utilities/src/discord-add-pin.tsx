import { Action, ActionPanel, Form, Icon, Toast, LocalStorage, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { PinnedLink, PinType } from "./types";

const PINS_KEY = "pinnedLinks";

// Simple ID generator to avoid dependencies
function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function AddPinCommand() {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [type, setType] = useState<PinType>("channel");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = async () => {
    if (!link.toLowerCase().startsWith("discord://")) {
      await showToast(Toast.Style.Failure, "Invalid Link", "Must start with discord://");
      return;
    }
    const pin: PinnedLink = {
      id: genId(),
      name: name.trim() || "Untitled",
      type,
      link: link.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      const raw = await LocalStorage.getItem<string>(PINS_KEY);
      const list: PinnedLink[] = raw ? (JSON.parse(raw) as PinnedLink[]) : [];
      list.push(pin);
      await LocalStorage.setItem(PINS_KEY, JSON.stringify(list));
      await showToast(Toast.Style.Success, "Pin Added");
      pop();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await showToast(Toast.Style.Failure, "Failed to save pin", msg);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Pin" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g., #general — MyServer" value={name} onChange={setName} />
      <Form.Dropdown id="type" title="Type" value={type} onChange={(v) => setType(v as PinType)}>
        <Form.Dropdown.Item value="server" title="Server" />
        <Form.Dropdown.Item value="channel" title="Channel" />
        <Form.Dropdown.Item value="dm" title="Direct Message" />
      </Form.Dropdown>
      <Form.TextField
        id="link"
        title="Link"
        placeholder="discord://-/channels/<guild>/<channel>"
        value={link}
        onChange={setLink}
      />
      <Form.TextField id="tags" title="Tags" placeholder="comma, separated, tags" value={tags} onChange={setTags} />
    </Form>
  );
}
