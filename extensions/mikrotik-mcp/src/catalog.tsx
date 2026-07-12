/**
 * Catalog command — browse the server's entire surface: every module, every tool
 * (with its risk), and every prompt (with its arguments + workflow body). Search
 * across all of it, and filter by kind or module group via the dropdown.
 */
import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useApi } from "./lib/hooks";

type Risk = "READ" | "WRITE" | "WRITE_IDEMPOTENT" | "DESTRUCTIVE" | "DANGEROUS";

interface ToolInfo {
  name: string;
  title: string;
  description: string;
  risk: Risk;
}
interface ModuleInfo {
  label: string;
  slug: string;
  group: string;
  description: string;
  toolCount: number;
  tools: ToolInfo[];
}
interface PromptArg {
  name: string;
  description?: string;
  required?: boolean;
}
interface PromptInfo {
  name: string;
  title: string;
  description: string;
  arguments: PromptArg[];
  body: string;
}
interface Catalog {
  modules: ModuleInfo[];
  prompts: PromptInfo[];
  groups: string[];
  counts: { modules: number; tools: number; prompts: number; groups: number };
  version: string;
}

const RISK_META: Record<Risk, { color: Color; label: string; icon: Icon }> = {
  READ: { color: Color.Green, label: "read", icon: Icon.Eye },
  WRITE: { color: Color.Orange, label: "write", icon: Icon.Pencil },
  WRITE_IDEMPOTENT: {
    color: Color.Yellow,
    label: "write (idempotent)",
    icon: Icon.Repeat,
  },
  DESTRUCTIVE: { color: Color.Red, label: "destructive", icon: Icon.Trash },
  DANGEROUS: { color: Color.Magenta, label: "dangerous", icon: Icon.Warning },
};

function toolMarkdown(t: ToolInfo, moduleLabel: string): string {
  return `# \`${t.name}\`\n\n**${t.title}**\n\n${t.description}\n\n---\n_Module: ${moduleLabel}_`;
}

function promptMarkdown(p: PromptInfo): string {
  return `# /${p.name}\n\n**${p.title}**\n\n${p.description}\n\n---\n\n${p.body}`;
}

function moduleMarkdown(m: ModuleInfo): string {
  const tools = m.tools.map((t) => `- \`${t.name}\` — ${t.title}`).join("\n");
  return `# ${m.label}\n\n${m.description}\n\n### ${m.toolCount} tool${m.toolCount === 1 ? "" : "s"}\n\n${tools}`;
}

export default function Command() {
  const { data, isLoading } = useApi<Catalog>("/api/catalog");
  const [filter, setFilter] = useState("all");

  const flatTools = useMemo(
    () =>
      (data?.modules ?? []).flatMap((m) =>
        m.tools.map((t) => ({ tool: t, module: m })),
      ),
    [data],
  );

  const showKind = (kind: "tools" | "prompts" | "modules"): boolean =>
    filter === "all" ||
    filter === kind ||
    (kind === "tools" && filter.startsWith("group:"));

  const groupFilter = filter.startsWith("group:")
    ? filter.slice("group:".length)
    : null;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search tools, prompts & modules…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter} storeValue>
          <List.Dropdown.Item
            title="Everything"
            value="all"
            icon={Icon.AppWindowGrid3x3}
          />
          <List.Dropdown.Section title="Kind">
            <List.Dropdown.Item
              title="Tools"
              value="tools"
              icon={Icon.Hammer}
            />
            <List.Dropdown.Item
              title="Prompts"
              value="prompts"
              icon={Icon.Stars}
            />
            <List.Dropdown.Item
              title="Modules"
              value="modules"
              icon={Icon.Box}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Tools by group">
            {(data?.groups ?? []).map((g) => (
              <List.Dropdown.Item
                key={g}
                title={g}
                value={`group:${g}`}
                icon={Icon.Folder}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {/* Prompts */}
      {showKind("prompts") && data && (
        <List.Section title="Prompts" subtitle={`${data.prompts.length}`}>
          {data.prompts.map((p) => (
            <List.Item
              key={`prompt:${p.name}`}
              icon={{ source: Icon.Stars, tintColor: Color.Purple }}
              title={p.name}
              subtitle={p.title}
              keywords={[p.title, ...p.description.split(/\s+/).slice(0, 12)]}
              accessories={[{ tag: { value: "prompt", color: Color.Purple } }]}
              detail={
                <List.Item.Detail
                  markdown={promptMarkdown(p)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Invoke"
                        text={`/${p.name}`}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      {p.arguments.length === 0 ? (
                        <List.Item.Detail.Metadata.Label
                          title="Arguments"
                          text="none"
                        />
                      ) : (
                        p.arguments.map((a) => (
                          <List.Item.Detail.Metadata.Label
                            key={a.name}
                            title={`${a.name}${a.required ? " *" : ""}`}
                            text={a.description ?? ""}
                          />
                        ))
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Invocation"
                    content={`/${p.name}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Prompt Body"
                    content={p.body}
                  />
                  <Action.CopyToClipboard title="Copy Name" content={p.name} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Tools (optionally scoped to one group) */}
      {showKind("tools") &&
        (() => {
          const items = flatTools.filter(
            ({ module }) => !groupFilter || module.group === groupFilter,
          );
          return (
            <List.Section
              title={groupFilter ? `Tools · ${groupFilter}` : "Tools"}
              subtitle={`${items.length}`}
            >
              {items.map(({ tool, module }) => {
                const r = RISK_META[tool.risk];
                return (
                  <List.Item
                    key={`tool:${tool.name}`}
                    icon={{ source: r.icon, tintColor: r.color }}
                    title={tool.name}
                    subtitle={tool.title}
                    keywords={[tool.title, module.label, module.group, r.label]}
                    accessories={[
                      { tag: { value: r.label, color: r.color } },
                      { text: module.label },
                    ]}
                    detail={
                      <List.Item.Detail
                        markdown={toolMarkdown(tool, module.label)}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.TagList title="Risk">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={r.label}
                                color={r.color}
                              />
                            </List.Item.Detail.Metadata.TagList>
                            <List.Item.Detail.Metadata.Label
                              title="Module"
                              text={module.label}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Group"
                              text={module.group}
                            />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy Tool Name"
                          content={tool.name}
                        />
                        <Action.CopyToClipboard
                          title="Copy Description"
                          content={tool.description}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })()}

      {/* Modules */}
      {showKind("modules") && data && (
        <List.Section title="Modules" subtitle={`${data.modules.length}`}>
          {data.modules.map((m) => (
            <List.Item
              key={`module:${m.slug}`}
              icon={{ source: Icon.Box, tintColor: Color.Blue }}
              title={m.label}
              subtitle={m.slug}
              keywords={[
                m.slug,
                m.group,
                ...m.description.split(/\s+/).slice(0, 12),
              ]}
              accessories={[
                { tag: { value: m.group, color: Color.Blue } },
                { text: `${m.toolCount} tools` },
              ]}
              detail={
                <List.Item.Detail
                  markdown={moduleMarkdown(m)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Slug"
                        text={m.slug}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Group"
                        text={m.group}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Tools"
                        text={`${m.toolCount}`}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Slug" content={m.slug} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={data ? "No matches" : "Loading catalog…"}
        description={
          data
            ? `${data.counts.tools} tools · ${data.counts.prompts} prompts · ${data.counts.modules} modules`
            : undefined
        }
      />
    </List>
  );
}
