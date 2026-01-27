import { Action, ActionPanel, Icon, List, Toast, open, showHUD, showToast } from "@raycast/api";
import { useMemo } from "react";
import { LOGOS_TOOL_GROUPS, type LogosTool } from "./data/logos-tools";
import { extractErrorMessage } from "./utils/errors";
import { LOGOS_BUNDLE_ID } from "./logos/constants";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search Atlas, Text Comparison, Sermon Builder, etc." throttle>
      {LOGOS_TOOL_GROUPS.map((group) => (
        <List.Section key={group.id} title={group.title} subtitle={group.subtitle}>
          {group.tools.map((tool) => (
            <ToolListItem key={tool.id} tool={tool} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ToolListItem({ tool }: { tool: LogosTool }) {
  const keywords = useMemo(() => getToolKeywords(tool), [tool]);
  return (
    <List.Item
      title={tool.name}
      subtitle={tool.description}
      icon={tool.icon ?? Icon.AppWindow}
      keywords={keywords}
      actions={<ToolActions tool={tool} />}
    />
  );
}

function ToolActions({ tool }: { tool: LogosTool }) {
  const uris = useMemo(() => buildToolUris(tool), [tool]);
  const primaryCommand = getPrimaryCommand(tool);
  const primaryUri = uris[0];

  return (
    <ActionPanel>
      <Action
        title="Open in Logos"
        icon={Icon.AppWindow}
        onAction={async () => {
          await launchTool(tool, uris);
        }}
      />
      <Action.CopyToClipboard title="Copy Command Text" content={primaryCommand} />
      {primaryUri ? <Action.CopyToClipboard title="Copy Launch URI" content={primaryUri} /> : null}
    </ActionPanel>
  );
}

async function launchTool(tool: LogosTool, uris?: string[]) {
  const candidates = uris?.length ? uris : buildToolUris(tool);
  if (candidates.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No launch URI available",
      message: "Try adding a custom command or run this from Logos' command box.",
    });
    return;
  }

  let lastError: unknown;
  for (const uri of candidates) {
    try {
      const isHttp = uri.startsWith("http://") || uri.startsWith("https://");
      await open(uri, isHttp ? undefined : LOGOS_BUNDLE_ID);
      await showHUD(`Opening ${tool.name}`);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  const previewList = candidates.slice(0, 3).join(", ");
  await showToast({
    style: Toast.Style.Failure,
    title: "Could not open Logos",
    message: `${extractErrorMessage(lastError)} — Tried ${previewList}${candidates.length > 3 ? ", …" : ""}`,
  });
}

function buildToolUris(tool: LogosTool) {
  const uris: string[] = [];
  const seen = new Set<string>();
  const add = (uri?: string) => {
    if (!uri) {
      return;
    }
    if (seen.has(uri)) {
      return;
    }
    seen.add(uri);
    uris.push(uri);
  };

  tool.uriHints?.forEach(add);

  for (const kind of tool.refLyKinds ?? []) {
    const trimmed = kind.trim();
    if (!trimmed) {
      continue;
    }
    const encodedKind = encodeURIComponent(trimmed);
    add(`https://ref.ly/logos4/${encodedKind}`);
    add(`https://ref.ly/logos4/Tools?kind=${encodedKind}`);
    add(`https://ref.ly/logos4/Tool?kind=${encodedKind}`);
    add(`https://ref.ly/logos4/Tools?kind=${encodedKind}&name=${encodedKind}`);
    add(`logos4:${trimmed}`);
    add(`logos4:${trimmed};Name=${trimmed}`);
    add(`logos4:Tools;Kind=${trimmed}`);
    add(`logos4:Tools;kind=${trimmed}`);
    add(`logos4:Tool;Kind=${trimmed}`);
    add(`logos4:Tools;Name=${trimmed}`);
    add(`logos4:Tools;Tool=${trimmed}`);
  }

  const interactiveSlugCandidates = new Set<string>();
  for (const slug of tool.interactiveSlugs ?? []) {
    const normalized = normalizeInteractiveSlug(slug);
    if (normalized) {
      interactiveSlugCandidates.add(normalized);
    }
  }
  for (const slug of getInteractiveSlugCandidates(tool)) {
    const normalized = normalizeInteractiveSlug(slug);
    if (normalized) {
      interactiveSlugCandidates.add(normalized);
    }
  }
  for (const slug of interactiveSlugCandidates) {
    const encodedSlug = encodeURIComponent(slug);
    add(`https://ref.ly/logosres/interactive:${encodedSlug}`);
    add(`https://ref.ly/logosres/interactive:${encodedSlug}?pos=index.html`);
    add(`logosres:interactive:${slug}`);
    add(`logosres:interactive:${slug}?pos=index.html`);
  }

  for (const interactiveId of tool.interactiveIds ?? []) {
    const trimmed = interactiveId.trim();
    if (!trimmed) {
      continue;
    }
    const encodedInteractive = encodeURIComponent(trimmed);
    add(`https://ref.ly/logos4/Interactive?name=${encodedInteractive}`);
    add(`logos4:Interactive;Name=${trimmed}`);
    add(`logos4:Interactive;name=${trimmed}`);
    add(`logos4:Interactive;Id=${trimmed}`);
  }

  for (const command of buildCommandCandidates(tool)) {
    const encodedCommand = encodeURIComponent(command);
    add(`https://ref.ly/logos4/Command?q=${encodedCommand}`);
    add(`https://ref.ly/logos4/Command?text=${encodedCommand}`);
    add(`logos4:Command?text=${encodedCommand}`);
    add(`logos4:Command;Command=${command}`);
    add(`logos4:Command;Name=Open;Text=${encodedCommand}`);
    add(`logos4-command://command/open?text=${encodedCommand}`);
    add(`logos4-command://command?text=${encodedCommand}`);
  }

  return uris;
}

function getPrimaryCommand(tool: LogosTool) {
  if (tool.commandPhrases?.length) {
    const first = tool.commandPhrases[0]?.trim();
    if (first) {
      return first;
    }
  }
  return tool.name;
}

function buildCommandCandidates(tool: LogosTool) {
  const set = new Set<string>();
  for (const command of tool.commandPhrases ?? []) {
    const trimmed = command.trim();
    if (trimmed.length > 0) {
      set.add(trimmed);
    }
  }
  if (tool.name.trim()) {
    set.add(tool.name.trim());
    set.add(`open ${tool.name.trim()}`);
  }
  return Array.from(set);
}

function getToolKeywords(tool: LogosTool) {
  const keywords = new Set<string>();
  for (const keyword of tool.keywords ?? []) {
    if (keyword.trim()) {
      keywords.add(keyword.trim());
    }
  }
  for (const command of tool.commandPhrases ?? []) {
    const trimmed = command.trim();
    if (trimmed) {
      keywords.add(trimmed);
    }
  }
  for (const kind of tool.refLyKinds ?? []) {
    const trimmed = kind.trim();
    if (trimmed) {
      keywords.add(trimmed);
    }
  }
  for (const interactiveId of tool.interactiveIds ?? []) {
    const trimmed = interactiveId.trim();
    if (trimmed) {
      keywords.add(trimmed);
    }
  }
  return Array.from(keywords);
}

function getInteractiveSlugCandidates(tool: LogosTool) {
  const sources = new Set<string>();
  const addSource = (value?: string) => {
    const trimmed = value?.trim();
    if (trimmed) {
      sources.add(trimmed);
    }
  };

  tool.interactiveIds?.forEach((rawId) => {
    const trimmed = rawId.trim();
    if (!trimmed) {
      return;
    }
    addSource(trimmed);
    addSource(decamelize(trimmed));
    const withoutInteractive = trimmed.replace(/Interactive$/i, "");
    if (withoutInteractive && withoutInteractive !== trimmed) {
      addSource(withoutInteractive);
      addSource(decamelize(withoutInteractive));
    }
  });

  addSource(tool.name);
  addSource(decamelize(tool.name));
  tool.commandPhrases?.forEach((phrase) => {
    addSource(phrase);
    addSource(decamelize(phrase));
  });
  tool.keywords?.forEach(addSource);
  addSource(tool.id);

  const slugSet = new Set<string>();
  for (const source of sources) {
    const lower = source.toLowerCase();
    const slug = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (slug) {
      slugSet.add(slug);
      const condensed = slug.replace(/-/g, "");
      if (condensed) {
        slugSet.add(condensed);
      }
    }
  }

  return Array.from(slugSet);
}

function decamelize(value?: string) {
  if (!value) {
    return value;
  }
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function normalizeInteractiveSlug(value?: string) {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.toLowerCase();
}
