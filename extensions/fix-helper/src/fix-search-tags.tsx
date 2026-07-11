import { Action, ActionPanel, List, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useMemo } from "react";
import { FIX_SPECS } from "./specs";

import { TagDetail, TagItem } from "./TagDetail";
import { getOnixsUrl, getTagIcon, getTagColor } from "./utils";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [version, setVersion] = useState(preferences.defaultVersion);
  const [searchText, setSearchText] = useState("");

  const spec = FIX_SPECS[version] || FIX_SPECS["FIX.4.4"];
  const versions = Object.keys(FIX_SPECS).sort();

  const tags: TagItem[] = useMemo(() => {
    return Object.entries(spec.tags)
      .map(([tagStr, tagDef]) => {
        const tag = parseInt(tagStr, 10);
        return {
          tag,
          name: tagDef.name,
          type: tagDef.type,
          enums: spec.enums[tag],
        };
      })
      .sort((a, b) => a.tag - b.tag);
  }, [spec]);

  const filteredTags = useMemo(() => {
    if (!searchText) return tags;
    const lowerSearch = searchText.toLowerCase();
    return tags.filter((t) => {
      const combined = `${t.tag} ${t.name} ${t.type || ""} ${
        t.enums ? Object.values(t.enums).join(" ") : ""
      }`.toLowerCase();
      return combined.includes(lowerSearch);
    });
  }, [tags, searchText]);

  return (
    <List
      navigationTitle={`Search FIX Tags (${version})`}
      searchBarPlaceholder="Search by tag number or name..."
      onSearchTextChange={setSearchText}
      isLoading={tags.length === 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select FIX Version"
          value={version}
          onChange={(newValue) => setVersion(newValue as typeof version)}
        >
          {versions.map((v) => (
            <List.Dropdown.Item key={v} title={v} value={v} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredTags.map((tag) => (
        <List.Item
          key={tag.tag}
          title={tag.name}
          subtitle={String(tag.tag)}
          accessories={[{ text: tag.enums ? `${Object.keys(tag.enums).length} values` : "" }]}
          icon={
            preferences.showIcons
              ? { source: getTagIcon(tag.tag, "", version), tintColor: getTagColor(tag.tag, "", version) }
              : undefined
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Tag Details"
                icon={Icon.Sidebar}
                target={<TagDetail tag={tag} version={version} />}
              />
              <Action.OpenInBrowser
                title="Open in OnixS Dictionary"
                url={getOnixsUrl(version, tag.tag)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
              <Action.CopyToClipboard content={String(tag.tag)} title="Copy Tag Number" />
              <Action.CopyToClipboard content={tag.name} title="Copy Tag Name" />
              {tag.type && <Action.CopyToClipboard content={tag.type} title="Copy Type" />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
