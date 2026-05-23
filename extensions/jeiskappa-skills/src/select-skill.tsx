import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  environment,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useMemo, useState } from "react";

type SkillReference = {
  path: string;
  bytes: number;
  body: string;
};

type Skill = {
  name: string;
  title: string;
  group: string;
  groupTitle: string;
  description: string;
  version: string;
  sourcePath: string;
  body: string;
  references: SkillReference[];
};

type Manifest = {
  generatedAt: string;
  source: string;
  groupOrder: string[];
  skills: Skill[];
};

type WrapOptions = {
  includeReferences?: boolean;
};

const loadManifest = (): Manifest => {
  const path = join(environment.assetsPath, "skills.json");
  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
};

const buildReferencesBlock = (refs: SkillReference[]): string => {
  if (refs.length === 0) return "";
  const inner = refs
    .map(
      (r) => `<reference path="${r.path}">\n${r.body.trimEnd()}\n</reference>`,
    )
    .join("\n");
  return `<references>\n${inner}\n</references>\n\n`;
};

const wrapPayload = (
  skill: Skill,
  prompt: string,
  options: WrapOptions = {},
): string => {
  const { includeReferences = true } = options;
  const refsBlock =
    includeReferences && skill.references.length > 0
      ? buildReferencesBlock(skill.references)
      : "";
  const wrapped = `<instruction>\n${refsBlock}${skill.body.trimEnd()}\n</instruction>`;
  const userPrompt = prompt.trim();
  return userPrompt ? `${wrapped}\n\n${userPrompt}\n` : `${wrapped}\n`;
};

const buildPreviewMarkdown = (skill: Skill): string => {
  if (skill.references.length === 0) return skill.body;
  const refsSection = skill.references
    .map((r) => `### \`${r.path}\`\n\n${r.body.trimEnd()}`)
    .join("\n\n");
  return `${skill.body.trimEnd()}\n\n---\n\n## Inlined references (${skill.references.length})\n\n${refsSection}\n`;
};

const groupBy = (skills: Skill[], order: string[]): [string, Skill[]][] => {
  const buckets = new Map<string, Skill[]>();
  for (const skill of skills) {
    const bucket = buckets.get(skill.group) ?? [];
    bucket.push(skill);
    buckets.set(skill.group, bucket);
  }
  const ordered: [string, Skill[]][] = [];
  for (const group of order) {
    const items = buckets.get(group);
    if (items && items.length > 0) ordered.push([group, items]);
  }
  for (const [group, items] of buckets) {
    if (!order.includes(group)) ordered.push([group, items]);
  }
  return ordered;
};

const copyToClipboard = async (payload: string, label: string) => {
  await Clipboard.copy(payload);
  await showHUD(`Copied ${label} to clipboard`);
  await closeMainWindow();
};

const pasteToFrontmost = async (payload: string) => {
  await Clipboard.paste(payload);
  await closeMainWindow();
};

const PromptForm = ({ skill }: { skill: Skill }) => {
  const { pop } = useNavigation();
  const hasRefs = skill.references.length > 0;

  const submit = async (
    values: { prompt: string },
    mode: "copy" | "paste",
    includeReferences: boolean,
  ) => {
    const payload = wrapPayload(skill, values.prompt ?? "", {
      includeReferences,
    });
    const label = `${skill.title}${hasRefs && !includeReferences ? " (no refs)" : ""}`;
    try {
      if (mode === "copy") {
        await Clipboard.copy(payload);
        await showHUD(`Copied ${label} + prompt to clipboard`);
      } else {
        await Clipboard.paste(payload);
      }
      await closeMainWindow();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: mode === "copy" ? "Could not copy" : "Could not paste",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const descriptionLine =
    `${skill.title}${skill.version ? `  ·  v${skill.version}` : ""}` +
    (hasRefs
      ? `  ·  ${skill.references.length} reference${skill.references.length === 1 ? "" : "s"} inlined`
      : "");

  return (
    <Form
      navigationTitle={skill.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Clipboard}
            title="Copy"
            onSubmit={(values) =>
              submit(values as { prompt: string }, "copy", true)
            }
          />
          <Action.SubmitForm
            icon={Icon.AppWindow}
            title="Paste"
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={(values) =>
              submit(values as { prompt: string }, "paste", true)
            }
          />
          {hasRefs ? (
            <ActionPanel.Section title="Without inlined references">
              <Action.SubmitForm
                icon={Icon.Clipboard}
                title="Copy Without References"
                shortcut={{ modifiers: ["cmd", "opt"], key: "return" }}
                onSubmit={(values) =>
                  submit(values as { prompt: string }, "copy", false)
                }
              />
              <Action.SubmitForm
                icon={Icon.AppWindow}
                title="Paste Without References"
                shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "return" }}
                onSubmit={(values) =>
                  submit(values as { prompt: string }, "paste", false)
                }
              />
            </ActionPanel.Section>
          ) : null}
          <Action
            icon={Icon.ArrowLeft}
            title="Back to Skills"
            shortcut={{ modifiers: ["cmd"], key: "[" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={skill.groupTitle}
        text={`${descriptionLine}\n${skill.description}`}
      />
      <Form.TextArea
        id="prompt"
        title="Your prompt"
        placeholder="What do you want the agent to do? (Submitting an empty prompt copies just the wrapped instruction.)"
        autoFocus
        enableMarkdown
      />
    </Form>
  );
};

const buildAccessories = (skill: Skill) => {
  const accessories: {
    icon?: Icon;
    text?: string;
    tooltip?: string;
    tag?: string;
  }[] = [];
  if (skill.references.length > 0) {
    accessories.push({
      icon: Icon.Paperclip,
      text: `${skill.references.length}`,
      tooltip: `${skill.references.length} reference file${skill.references.length === 1 ? "" : "s"} inlined`,
    });
  }
  if (skill.version) accessories.push({ tag: `v${skill.version}` });
  return accessories.length > 0 ? accessories : undefined;
};

export default function Command() {
  const [showDetail, setShowDetail] = useState(true);
  const manifest = useMemo(() => {
    try {
      return loadManifest();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load skills.json",
        message: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }, []);

  if (!manifest) {
    return (
      <List>
        <List.EmptyView
          title="Skills manifest missing"
          description="Run `npm run sync` from the extension folder to regenerate assets/skills.json."
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  const sections = groupBy(manifest.skills, manifest.groupOrder);

  return (
    <List
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search skills by name, group, or description"
    >
      {sections.map(([group, items]) => (
        <List.Section
          key={group}
          title={items[0]?.groupTitle ?? group}
          subtitle={`${items.length} skill${items.length === 1 ? "" : "s"}`}
        >
          {items.map((skill) => {
            const hasRefs = skill.references.length > 0;
            return (
              <List.Item
                key={`${skill.group}/${skill.name}`}
                title={skill.title}
                subtitle={showDetail ? undefined : skill.description}
                keywords={[
                  skill.name,
                  skill.group,
                  skill.groupTitle,
                  ...skill.description.split(/\s+/),
                ]}
                accessories={buildAccessories(skill)}
                icon={skill.group === "deprecated" ? Icon.Hourglass : Icon.Book}
                detail={
                  <List.Item.Detail
                    markdown={buildPreviewMarkdown(skill)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Skill"
                          text={skill.name}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Group"
                          text={skill.groupTitle}
                        />
                        {skill.version ? (
                          <List.Item.Detail.Metadata.Label
                            title="Version"
                            text={skill.version}
                          />
                        ) : null}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Description"
                          text={skill.description || "—"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Source"
                          text={skill.sourcePath}
                        />
                        {hasRefs ? (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.TagList title="Inlined references">
                              {skill.references.map((r) => (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={r.path}
                                  text={r.path}
                                />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                          </>
                        ) : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        icon={Icon.Pencil}
                        title="Continue with Prompt…"
                        target={<PromptForm skill={skill} />}
                      />
                      <Action
                        icon={Icon.Clipboard}
                        title="Copy Skill Without Prompt"
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                        onAction={() =>
                          copyToClipboard(wrapPayload(skill, ""), skill.title)
                        }
                      />
                      <Action
                        icon={Icon.AppWindow}
                        title="Paste Skill in Frontmost App"
                        shortcut={{
                          modifiers: ["cmd", "shift"],
                          key: "return",
                        }}
                        onAction={() =>
                          pasteToFrontmost(wrapPayload(skill, ""))
                        }
                      />
                    </ActionPanel.Section>
                    {hasRefs ? (
                      <ActionPanel.Section title="Without inlined references">
                        <Action
                          icon={Icon.Clipboard}
                          title="Copy Skill Without References"
                          shortcut={{
                            modifiers: ["cmd", "opt"],
                            key: "return",
                          }}
                          onAction={() =>
                            copyToClipboard(
                              wrapPayload(skill, "", {
                                includeReferences: false,
                              }),
                              `${skill.title} (no refs)`,
                            )
                          }
                        />
                        <Action
                          icon={Icon.AppWindow}
                          title="Paste Skill Without References"
                          shortcut={{
                            modifiers: ["cmd", "opt", "shift"],
                            key: "return",
                          }}
                          onAction={() =>
                            pasteToFrontmost(
                              wrapPayload(skill, "", {
                                includeReferences: false,
                              }),
                            )
                          }
                        />
                      </ActionPanel.Section>
                    ) : null}
                    <ActionPanel.Section>
                      <Action
                        icon={Icon.AppWindowSidebarRight}
                        title={showDetail ? "Hide Preview" : "Show Preview"}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                        onAction={() => setShowDetail((s) => !s)}
                      />
                      <Action.CopyToClipboard
                        icon={Icon.Code}
                        title="Copy Raw Skill Body"
                        content={skill.body}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
