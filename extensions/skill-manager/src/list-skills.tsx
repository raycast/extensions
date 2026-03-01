import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { deleteSkill, loadSkills, Skill } from "./utils/skills";
import AddSkill from "./add-skill";

/**
 * Build the plain-text representation of a skill suitable for a Raycast snippet.
 */
function skillToSnippetText(skill: Skill): string {
  const tagLine = skill.tags.length > 0 ? `\nTags: ${skill.tags.join(", ")}` : "";
  return `${skill.name}${tagLine}\n\n${skill.description}`;
}

function skillToMarkdownLink(skill: Skill): string {
  const skillPath = skill.skillFilePath;
  const skillLabel = `$${skill.name}`.replace(/\]/g, "\\]");
  if (!skillPath) {
    return `[${skillLabel}](SKILL.md)`;
  }
  return `[${skillLabel}](${skillPath})`;
}

export default function ListSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedTag, setSelectedTag] = useState("__all__");
  const { push } = useNavigation();

  async function refresh() {
    setIsLoading(true);
    try {
      const loaded = await loadSkills();
      setSkills(loaded);
    } catch (err: unknown) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load skills", message: String(err) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const allTags = useMemo(() => {
    return Array.from(new Set(skills.flatMap((skill) => skill.tags))).sort((a, b) => a.localeCompare(b));
  }, [skills]);

  const filtered = skills.filter((s) => {
    const q = searchText.toLowerCase();
    const matchesQuery =
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q));
    const matchesTag = selectedTag === "__all__" || s.tags.includes(selectedTag);
    return matchesQuery && matchesTag;
  });

  async function handleDelete(skill: Skill) {
    const confirmed = await confirmAlert({
      title: `Delete "${skill.name}"?`,
      message: "This will remove the skill folder from your central agents skills directory.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await deleteSkill(skill.name);
      await showToast({ style: Toast.Style.Success, title: "Skill deleted" });
      await refresh();
    } catch (err: unknown) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to delete skill", message: String(err) });
    }
  }

  async function handleCopySnippet(skill: Skill) {
    const text = skillToSnippetText(skill);
    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard", message: skill.name });
  }

  async function handleCopyMarkdownLink(skill: Skill) {
    const link = skillToMarkdownLink(skill);
    await Clipboard.copy(link);
    await showToast({ style: Toast.Style.Success, title: "Markdown link copied", message: skill.name });
  }

  /**
   * Creates a Raycast snippet import URL for the skill.
   * Raycast supports importing snippets via a deeplink:
   *   raycast://snippets/import?payload=<base64-encoded-JSON>
   */
  async function handleCreateRaycastSnippet(skill: Skill) {
    const keyword = skill.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const payload = JSON.stringify([
      {
        name: skill.name,
        text: skillToSnippetText(skill),
        keyword: `!${keyword}`,
      },
    ]);

    const encoded = Buffer.from(payload).toString("base64");
    const deeplinkUrl = `raycast://snippets/import?payload=${encoded}`;

    await Clipboard.copy(deeplinkUrl);
    await showToast({
      style: Toast.Style.Success,
      title: "Snippet deeplink copied",
      message: `Keyword: !${keyword} — paste the link in a browser to import`,
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search skills by name, description or tag…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" value={selectedTag} onChange={setSelectedTag}>
          <List.Dropdown.Item title="All Tags" value="__all__" />
          {allTags.map((tag) => (
            <List.Dropdown.Item key={tag} title={tag} value={tag} />
          ))}
        </List.Dropdown>
      }
      isShowingDetail
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Book}
          title="No skills found"
          description="Use 'Add Skill' to create your first skill."
          actions={
            <ActionPanel>
              <Action title="Add Skill" icon={Icon.Plus} onAction={() => push(<AddSkill onSave={refresh} />)} />
            </ActionPanel>
          }
        />
      ) : (
        filtered.map((skill) => (
          <List.Item
            key={skill.name}
            title={skill.name}
            accessories={skill.tags.map((t) => ({ tag: { value: t, color: Color.Blue } }))}
            detail={
              <List.Item.Detail
                markdown={`## ${skill.name}\n\n${skill.description}`}
                metadata={
                  skill.tags.length > 0 ? (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {skill.tags.map((t) => (
                          <List.Item.Detail.Metadata.TagList.Item key={t} text={t} color={Color.Blue} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  ) : undefined
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Snippets">
                  <Action
                    title="Create Raycast Snippet"
                    icon={Icon.Snippets}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => handleCreateRaycastSnippet(skill)}
                  />
                  <Action
                    title="Copy Skill Text"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => handleCopySnippet(skill)}
                  />
                  <Action
                    title="Copy Markdown Skill Link"
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => handleCopyMarkdownLink(skill)}
                  />
                  <Action.Paste
                    title="Paste Markdown Skill Link"
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    content={skillToMarkdownLink(skill)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage">
                  <Action
                    title="Edit Skill"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => push(<AddSkill existingSkill={skill} onSave={refresh} />)}
                  />
                  <Action
                    title="Delete Skill"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(skill)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Add">
                  <Action
                    title="Add New Skill"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<AddSkill onSave={refresh} />)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
