import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, getApplications } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { loadLayers, saveLayers } from "./data";
import { fileTitle, searchFiles } from "./file-search";
import { generateId, normalizeKey } from "./schema";
import { ENTRY_KINDS } from "./types";
import type { Entry, EntryKind } from "./types";

function entryKindLabel(kind: EntryKind): string {
  switch (kind) {
    case "app":
      return "Application";
    case "file":
      return "File / Folder";
    case "url":
      return "URL / Deeplink";
    case "shell":
      return "Shell Command";
  }
}

function entryKindPlaceholder(kind: EntryKind): string {
  switch (kind) {
    case "app":
      return "/Applications/Ghostty.app";
    case "file":
      return "~/Documents";
    case "url":
      return "raycast://extensions/…";
    case "shell":
      return "open -a Ghostty";
  }
}

export function EntryForm({
  layerId,
  existing,
  initial,
  title,
  mutate,
}: {
  layerId: string;
  existing?: Entry;
  initial?: Entry;
  title?: string;
  mutate: () => void;
}) {
  const { pop } = useNavigation();
  const source = existing ?? initial;
  const [key, setKey] = useState(source?.key ?? "");
  const [kind, setKind] = useState<EntryKind>(source?.kind ?? "app");
  const [value, setValue] = useState(source?.value ?? "");
  const [keyError, setKeyError] = useState<string | undefined>();
  const [filter, setFilter] = useState("");
  const [fileResults, setFileResults] = useState<string[]>([]);
  const [takenKeys, setTakenKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLayers().then((layers) => {
      const layer = layers.find((l) => l.id === layerId);
      const map: Record<string, string> = {};
      for (const entry of layer?.entries ?? []) {
        if (entry.key && entry.id !== existing?.id) map[entry.key] = entry.title;
      }
      setTakenKeys(map);
    });
  }, [layerId, existing?.id]);

  useEffect(() => {
    const takenBy = key ? takenKeys[key] : undefined;
    setKeyError(takenBy ? `Already used by "${takenBy}"` : undefined);
  }, [key, takenKeys]);

  const { data: apps } = usePromise(getApplications);
  const applications = [...(apps ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    setFilter("");
    setFileResults([]);
  }, [kind]);

  useEffect(() => {
    if (kind !== "file") return;
    const query = filter.trim();
    if (query.length < 2) {
      setFileResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await searchFiles(query);
      if (!cancelled) setFileResults(results);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filter, kind]);

  async function submit(values: { title: string; keywords: string }) {
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) {
      setKeyError("Key is required");
      return;
    }
    const title = values.title.trim();
    const target = kind === "file" ? value : value.trim();
    if (!title || !target) {
      await showToast({ style: Toast.Style.Failure, title: "Title and target are required" });
      return;
    }

    const layers = await loadLayers();
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) {
      await showToast({ style: Toast.Style.Failure, title: "Layer no longer exists" });
      return;
    }

    const clash = layer.entries.find((e) => e.key === normalizedKey && e.id !== existing?.id);
    if (clash) {
      setKeyError(`Already used by "${clash.title}"`);
      return;
    }

    const keywords = values.keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const entry: Entry = {
      id: existing?.id ?? generateId(),
      key: normalizedKey,
      title,
      kind,
      value: target,
      keywords: keywords.length > 0 ? keywords : undefined,
    };

    if (existing) {
      layer.entries = layer.entries.map((e) => (e.id === existing.id ? entry : e));
    } else {
      layer.entries.push(entry);
    }

    await saveLayers(layers);
    mutate();
    showToast({ style: Toast.Style.Success, title: existing ? "Action updated" : "Action added" });
    pop();
  }

  const typed = filter.trim();

  return (
    <Form
      navigationTitle={title ?? (existing ? "Edit Action" : "Add Action")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existing ? "Save Action" : "Add Action"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="key"
        title="Key"
        placeholder="d"
        value={key}
        error={keyError}
        info="g/G"
        onChange={(next) => setKey([...next].at(-1) ?? "")}
      />
      <Form.TextField id="title" title="Title" placeholder="Action name" defaultValue={source?.title} />
      <Form.Dropdown id="kind" title="Type" value={kind} onChange={(next) => setKind(next as EntryKind)}>
        {ENTRY_KINDS.map((option) => (
          <Form.Dropdown.Item key={option} title={entryKindLabel(option)} value={option} />
        ))}
      </Form.Dropdown>

      {kind === "app" && (
        <Form.Dropdown
          id="value"
          title="Target"
          placeholder="Search applications…"
          filtering={false}
          value={value}
          onChange={setValue}
          onSearchTextChange={setFilter}
          info={'Search installed applications, or type a path and pick "Use path"'}
        >
          {applications
            .filter((app) => {
              const query = typed.toLowerCase();
              return !query || app.name.toLowerCase().includes(query) || app.path.toLowerCase().includes(query);
            })
            .map((app) => (
              <Form.Dropdown.Item
                key={app.path}
                value={app.path}
                title={app.name}
                icon={{ fileIcon: app.path }}
                keywords={[app.bundleId ?? "", app.path]}
              />
            ))}
          {value === "" && <Form.Dropdown.Item key="__empty" value="" title="Choose an application…" />}
          {value !== "" && !applications.some((app) => app.path === value) && (
            <Form.Dropdown.Item key={value} value={value} title={value} icon={Icon.Terminal} />
          )}
          {typed.length > 0 && !applications.some((app) => app.path === typed) && (
            <Form.Dropdown.Item key="__custom" value={typed} title={`Use path: ${typed}`} icon={Icon.Pencil} />
          )}
        </Form.Dropdown>
      )}

      {kind === "file" && (
        <Form.Dropdown
          id="value"
          title="Target"
          placeholder="Search files and folders…"
          filtering={false}
          value={value}
          onChange={setValue}
          onSearchTextChange={setFilter}
          info={'Search indexed files and folders, or type a path and pick "Use path"'}
        >
          {fileResults.map((path) => (
            <Form.Dropdown.Item key={path} value={path} title={fileTitle(path)} icon={{ fileIcon: path }} />
          ))}
          {value === "" && fileResults.length === 0 && (
            <Form.Dropdown.Item key="__empty" value="" title="Choose a file or folder…" />
          )}
          {value !== "" && !fileResults.includes(value) && (
            <Form.Dropdown.Item key={value} value={value} title={value} icon={Icon.Document} />
          )}
          {typed.length >= 2 && !fileResults.includes(typed) && (
            <Form.Dropdown.Item key="__custom" value={typed} title={`Use path: ${typed}`} icon={Icon.Pencil} />
          )}
        </Form.Dropdown>
      )}

      {(kind === "url" || kind === "shell") && (
        <Form.TextField
          id="value"
          title="Target"
          placeholder={entryKindPlaceholder(kind)}
          value={value}
          onChange={setValue}
        />
      )}

      <Form.TextField
        id="keywords"
        title="Keywords"
        placeholder="Optional, comma separated"
        defaultValue={source?.keywords?.join(", ")}
        info="Extra search terms, like tags, so typing any of them finds this action"
      />
    </Form>
  );
}
