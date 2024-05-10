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
  simd: number;
  title: string;
  authors: string[];
  status: "Idea" | "Draft" | "Review" | "Last Call" | "Final" | "Stagnant" | "Withdrawn" | "Living" | "Moved";
  type: "Standard" | "Meta";
  category: "Core" | "Interface" | "Networking" | "Meta";
  created: Date;
}

interface SIMDFile {
  content: string;
	data: Metadata;
  github: string;
}

const type_colors = {
  Standard: "#007bff",
  Meta: "#ffc107",
};

const category_colors = {
  Core: "#8B0A1A",
  Interface: "#4CAF50",
  Networking: "#2196F3",
  Meta: "#FFC107",
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
  keys: ["data.simd", "data.title", "data.authors", "content"],
};

function path_to_github(path: string, base: string) {
  const parts = path.replace(base, "").split("/");
  const repo = parts[1];
  const tail = parts.slice(2).join("/");
  return `https://github.com/solana-foundation/solana-improvement-documents/blob/main/${repo}/${tail}`;
}

export function SIMDMetadata({ meta }: { meta: Metadata }) {
  console.log(meta.authors)
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="simd" text={meta.simd.toString()} />
      <List.Item.Detail.Metadata.Label title="title" text={meta.title} />
      <List.Item.Detail.Metadata.Label title="author" text={meta.authors.toString()} />
      <List.Item.Detail.Metadata.Label title="created" text={meta.created.toISOString()} />
      <List.Item.Detail.Metadata.TagList title="type / category / status">
        <List.Item.Detail.Metadata.TagList.Item text={meta.type} color={type_colors[meta.type]} />
        <List.Item.Detail.Metadata.TagList.Item text={meta.category} color={category_colors[meta.category]} />
        <List.Item.Detail.Metadata.TagList.Item text={meta.status} color={status_colors[meta.status]} />
      </List.Item.Detail.Metadata.TagList>
    </List.Item.Detail.Metadata>
  );
}

export function SIMDDetail({ item }: { item: SIMDFile }) {
  return (
    <Detail
      markdown={item.content}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.github} title="GitHub" />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();
  const base = preferences.repos_path;

  const simds = useMemo(() => {
    const files = globSync([`${base}/proposals/*.md`]);
    const matters = files.map((path) => {
      const md = matter(fs.readFileSync(path));

    console.log(path_to_github(path, base))
      return {
        data: md.data as Metadata,
        content: md.content,
        github: path_to_github(path, base),
      };
    });
    return matters.filter((item) => item.data.status !== "Moved", );
  }, []).sort((a, b) => a.data.simd - b.data.simd);

  const fuse = new Fuse(simds, fuse_options);
  const data: SIMDFile[] = searchText ? fuse.search(searchText).map((item) => item.item) : simds;

  return (
    <List onSearchTextChange={setSearchText} isShowingDetail throttle>
      {data.map((item: SIMDFile) => (
        <List.Item
          key={`${item.data.simd}`}
					subtitle={`${item.data.simd}`}
          title={item.data.title ?? "??"}
          detail={<List.Item.Detail metadata={<SIMDMetadata meta={item.data} />} />}
          actions={
            <ActionPanel title={`${item.data.simd} ${item.data.title}`}>
              <Action.Push title="Instant View" target={<SIMDDetail item={item} />} />
              <Action.OpenInBrowser url={item.github} title="GitHub" />
           </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
