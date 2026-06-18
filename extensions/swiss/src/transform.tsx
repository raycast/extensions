import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Clipboard, Icon, List, getSelectedText } from "@raycast/api";
import { runSwiss, shellCommand, TRANSFORMS, Transform } from "./swiss";
import { NotInstalled, useSwissInstalled } from "./not-installed";

interface Result {
  transform: Transform;
  output: string;
}

const GROUPS = ["All", "Encoding", "Hashing", "Data", "Crypto", "Text", "Network", "Misc"];

export default function Command() {
  const [input, setInput] = useState("");
  const [group, setGroup] = useState("All");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);
  const installed = useSwissInstalled();

  // Prefill from the current selection, falling back to the clipboard.
  useEffect(() => {
    (async () => {
      try {
        const selected = await getSelectedText();
        if (selected?.trim()) {
          setInput(selected);
          return;
        }
      } catch {
        // no selection — try the clipboard
      }
      const clip = await Clipboard.readText();
      if (clip?.trim()) setInput(clip);
    })();
  }, []);

  useEffect(() => {
    const value = input;
    if (!value.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const runId = ++latest.current;
    setLoading(true);
    Promise.all(
      TRANSFORMS.map(async (transform) => {
        try {
          const out = (await runSwiss(transform.args, value)).replace(/\s+$/, "");
          return out.length > 0 ? { transform, output: out } : null;
        } catch {
          return null;
        }
      }),
    ).then((settled) => {
      if (runId !== latest.current) return;
      setResults(settled.filter((r): r is Result => r !== null));
      setLoading(false);
    });
  }, [input]);

  const visible = results.filter((r) => group === "All" || r.transform.group === group);

  if (installed === false) return <NotInstalled />;

  return (
    <List
      isLoading={loading}
      filtering={false}
      searchText={input}
      onSearchTextChange={setInput}
      throttle
      isShowingDetail={visible.length > 0}
      searchBarPlaceholder="Type or paste a value to transform…"
      searchBarAccessory={
        <List.Dropdown tooltip="Category" value={group} onChange={setGroup}>
          {GROUPS.map((g) => (
            <List.Dropdown.Item key={g} title={g} value={g} />
          ))}
        </List.Dropdown>
      }
    >
      {!input.trim() ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="Type something to transform"
          description="base64, hash, json → yaml, jwt decode, slug, ip, color and more — powered by the swiss CLI, fully offline."
        />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No transform produced a result" />
      )}
      {visible.map((r) => (
        <List.Item
          key={r.transform.id}
          title={r.transform.title}
          subtitle={r.transform.group}
          icon={Icon.ArrowRight}
          detail={
            <List.Item.Detail
              markdown={"```\n" + r.output + "\n```"}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Operation" text={r.transform.title} />
                  <List.Item.Detail.Metadata.Label title="Command" text={shellCommand(r.transform)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Result" content={r.output} />
              <Action.Paste title="Paste Result" content={r.output} />
              <Action.CopyToClipboard
                title="Copy Command"
                content={shellCommand(r.transform)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
