import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Detail,
  useNavigation,
} from "@raycast/api";
import { PromptTemplate } from "./types";
import {
  fetchPromptTemplates,
  searchTemplates,
  filterByTag,
  getAllTags,
} from "./api";
import { formatTags, getPromptLocation } from "./utils";
import { VariableForm } from "./components/VariableForm";

export default function Command() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<PromptTemplate[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const { push } = useNavigation();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    let filtered = templates;

    // Apply tag filter
    if (selectedTag) {
      filtered = filterByTag(filtered, selectedTag);
    }

    // Apply search filter
    if (searchText) {
      filtered = searchTemplates(filtered, searchText);
    }

    setFilteredTemplates(filtered);
  }, [templates, searchText, selectedTag]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const fetchedTemplates = await fetchPromptTemplates();
      setTemplates(fetchedTemplates);
      setFilteredTemplates(fetchedTemplates);
      setAvailableTags(getAllTags(fetchedTemplates));

      if (fetchedTemplates.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Templates Found",
          message: "No prompt templates found in your PromptLayer account.",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Loading Templates",
        message:
          error instanceof Error ? error.message : "Failed to load templates",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: PromptTemplate) => {
    // Use input_variables from PromptLayer instead of parsing
    const variables = template.input_variables || [];

    if (variables.length > 0) {
      // Navigate to variable form
      push(<VariableForm template={template} variables={variables} />);
    } else {
      // No variables, copy directly
      copyTemplate(template);
    }
  };

  const copyTemplate = async (template: PromptTemplate) => {
    try {
      await Clipboard.copy(template.template);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
        message: `"${template.name}" copied`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: "Failed to copy template to clipboard",
      });
    }
  };

  const showTemplateDetail = (template: PromptTemplate) => {
    const variables = template.input_variables || [];
    const location = getPromptLocation(template.metadata);
    const tags = formatTags(template.tags);

    const markdown = `
# ${template.name}

${template.metadata?.description ? `**Description:** ${template.metadata.description}\n` : ""}
${location ? `**Location:** ${location}\n` : ""}
${tags ? `**Tags:** ${tags}\n` : ""}
${variables.length > 0 ? `**Variables:** ${variables.join(", ")}\n` : ""}

## Template Content

\`\`\`
${template.template}
\`\`\`
    `;

    push(
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Fill Template"
              onAction={() => handleTemplateSelect(template)}
              icon={Icon.Pencil}
            />
            <Action
              title="Copy Raw Template"
              onAction={() => copyTemplate(template)}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel>
        }
      />,
    );
  };

  const getSubtitle = (template: PromptTemplate): string => {
    const parts = [];
    const variables = template.input_variables || [];
    const location = getPromptLocation(template.metadata);

    if (variables.length > 0) {
      parts.push(
        `${variables.length} variable${variables.length > 1 ? "s" : ""}`,
      );
    }

    if (location) {
      parts.push(location);
    }

    return parts.join(" • ");
  };

  const getAccessories = (template: PromptTemplate) => {
    const accessories = [];
    const tags = template.tags;

    if (tags && tags.length > 0) {
      accessories.push({ text: formatTags(tags.slice(0, 2)) });
    }

    return accessories;
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Tag"
          placeholder="All Tags"
          onChange={setSelectedTag}
        >
          <List.Dropdown.Item title="All Tags" value="" />
          {availableTags.map((tag) => (
            <List.Dropdown.Item key={tag} title={tag} value={tag} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredTemplates.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Templates Found"
          description={
            searchText || selectedTag
              ? "Try adjusting your search or filter criteria"
              : "No prompt templates available"
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                onAction={loadTemplates}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredTemplates.map((template) => (
          <List.Item
            key={template.id}
            title={template.name}
            subtitle={getSubtitle(template)}
            accessories={getAccessories(template)}
            actions={
              <ActionPanel>
                <Action
                  title="Fill Template"
                  onAction={() => handleTemplateSelect(template)}
                  icon={Icon.Pencil}
                />
                <Action
                  title="View Details"
                  onAction={() => showTemplateDetail(template)}
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action
                  title="Copy Raw Template"
                  onAction={() => copyTemplate(template)}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <ActionPanel.Section>
                  <Action
                    title="Refresh Templates"
                    onAction={loadTemplates}
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
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
