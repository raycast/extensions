import fs from "node:fs";
import { Action, ActionPanel, Detail, List, getPreferenceValues } from "@raycast/api";
import Fuse from "fuse.js";
import { globSync } from "glob";
import matter from "gray-matter";
import { useMemo, useState } from "react";

interface Preferences {
  repos_path: string;
}

interface Metadata {
  eip: number;
  title: string;
  author: string;
  status: "Idea" | "Draft" | "Review" | "Last Call" | "Final" | "Stagnant" | "Withdrawn" | "Living" | "Moved";
  type: "Standards Track" | "Meta" | "Informational";
  category: "Core" | "Interface" | "Networking" | "ERC";
  created: Date;
  "discussions-to": string;
}

type EipKind = "EIP" | "ERC";

interface EipFile {
  data: Metadata;
  content: string;
  github: string;
  kind: EipKind;
}

const type_colors = {
  "Standards Track": "#007bff",
  Meta: "#ffc107",
  Informational: "#28a745",
};

const category_colors = {
  Core: "#8B0A1A",
  Interface: "#4CAF50",
  Networking: "#2196F3",
  ERC: "#FFC107",
};

const status_colors = {
  Idea: "#CCCCCC",
  Draft: "#87CEEB",
  Review: "#F7DC6F",
  "Last Call": "#FFC107",
  Final: "#2ECC40",
  Stagnant: "#AAAAAA",
  Withdrawn: "#FF69B4",
  Living: "#8BC34A",
  Moved: "#8B0A1A",
};

const fuse_options = {
  keys: ["data.eip", "data.title", "data.author", "content"],
};

function path_to_github(path: string, base: string) {
  const parts = path.replace(base, "").split("/");
  const repo = parts[1];
  const tail = parts.slice(2).join("/");
  return `https://github.com/ethereum/${repo}/blob/master/${tail}`;
}

export function EipMetadata({ meta }: { meta: Metadata }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="eip" text={meta.eip.toString()} />
      <List.Item.Detail.Metadata.Label title="title" text={meta.title} />
      <List.Item.Detail.Metadata.Label title="author" text={meta.author} />
      <List.Item.Detail.Metadata.Label title="created" text={meta.created.toISOString()} />
      <List.Item.Detail.Metadata.TagList title="type / category / status">
        <List.Item.Detail.Metadata.TagList.Item text={meta.type} color={type_colors[meta.type]} />
        <List.Item.Detail.Metadata.TagList.Item text={meta.category} color={category_colors[meta.category]} />
        <List.Item.Detail.Metadata.TagList.Item text={meta.status} color={status_colors[meta.status]} />
      </List.Item.Detail.Metadata.TagList>
    </List.Item.Detail.Metadata>
  );
}

export function EipDetail({ item }: { item: EipFile }) {
  return (
    <Detail
      markdown={item.content}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.github} title="GitHub" />
          <Action.OpenInBrowser url={item.data["discussions-to"]} title="Ethereum Magicians" />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();
  const base = preferences.repos_path;

  const eips = useMemo(() => {
    const files = globSync([`${base}/EIPs/EIPS/eip-*.md`, `${base}/ERCs/ERCS/erc-*.md`]);
    const matters = files.map((path) => {
      const md = matter(fs.readFileSync(path));
      return {
        data: md.data as Metadata,
        content: md.content,
        kind: (path.toLowerCase().includes("/eip-") ? "EIP" : "ERC") as EipKind,
        github: path_to_github(path, base),
      };
    });
    return matters.filter((item) => item.data.status !== "Moved");
  }, []);

  const fuse = new Fuse(eips, fuse_options);
  const data: EipFile[] = searchText ? fuse.search(searchText).map((item) => item.item) : eips;

  return (
    <List onSearchTextChange={setSearchText} isShowingDetail throttle>
      {data.map((item) => (
        <List.Item
          key={`${item.kind}-${item.data.eip}`}
          title={item.data.title ?? "??"}
          subtitle={`${item.kind}-${item.data.eip}`}
          detail={<List.Item.Detail metadata={<EipMetadata meta={item.data} />} />}
          actions={
            <ActionPanel title={`${item.kind}-${item.data.eip} ${item.data.title}`}>
              <Action.Push title="Instant View" target={<EipDetail item={item} />} />
              <Action.OpenInBrowser url={item.github} title="GitHub" />
              <Action.OpenInBrowser
                url={item.data["discussions-to"]}
                title="Ethereum Magicians"
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
