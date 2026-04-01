import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Icon, List, useNavigation } from "@raycast/api";
import fs from "fs";
import { parseM3u, loadChannelsFromJson, saveChannelsToJson } from "./lib/channels";
import { Channel } from "./lib/types";

function ImportForm() {
  const { push } = useNavigation();

  function handleSubmit(values: { file: string[] }) {
    const filePath = values.file?.[0];
    if (!filePath) {
      showToast({ style: Toast.Style.Failure, title: "No file selected" });
      return;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = parseM3u(content);

      if (parsed.length === 0) {
        showToast({ style: Toast.Style.Failure, title: "No channels found in file" });
        return;
      }

      push(<ImportPreview channels={parsed} />);
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Could not read file" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse Playlist" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="M3U Playlist File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Description text="Select an .m3u or .m3u8 playlist file. Channels will be parsed and shown for review before importing." />
    </Form>
  );
}

function ImportPreview({ channels }: { channels: Channel[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(channels.map((c) => c.url)));

  function toggleChannel(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }

  async function importSelected() {
    const toImport = channels.filter((c) => selected.has(c.url));
    if (toImport.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No channels selected" });
      return;
    }

    const existing = loadChannelsFromJson();
    const existingUrls = new Set(existing.map((c) => c.url));
    const newChannels = toImport.filter((c) => !existingUrls.has(c.url));

    if (newChannels.length === 0) {
      await showToast({ style: Toast.Style.Success, title: "All selected channels already exist" });
      return;
    }

    saveChannelsToJson([...existing, ...newChannels]);
    await showToast({
      style: Toast.Style.Success,
      title: `Imported ${newChannels.length} channel${newChannels.length === 1 ? "" : "s"}`,
    });
  }

  const grouped = new Map<string, Channel[]>();
  for (const channel of channels) {
    const list = grouped.get(channel.group);
    if (list) {
      list.push(channel);
    } else {
      grouped.set(channel.group, [channel]);
    }
  }

  return (
    <List>
      <List.Section title={`${channels.length} channels found — ${selected.size} selected`}>
        {[...grouped.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .flatMap(([, group]) =>
            group.map((channel) => (
              <List.Item
                key={channel.url}
                title={channel.name}
                subtitle={channel.group}
                icon={selected.has(channel.url) ? { source: Icon.CheckCircle, tintColor: "green" } : Icon.Circle}
                actions={
                  <ActionPanel>
                    <Action
                      title="Toggle Selection"
                      icon={Icon.CheckCircle}
                      onAction={() => toggleChannel(channel.url)}
                    />
                    <Action
                      title={`Import ${selected.size} Channels`}
                      icon={Icon.Download}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={importSelected}
                    />
                  </ActionPanel>
                }
              />
            )),
          )}
      </List.Section>
    </List>
  );
}

export default function ImportChannels() {
  return <ImportForm />;
}
