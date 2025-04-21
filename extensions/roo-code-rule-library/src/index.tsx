import React from "react";
import { ActionPanel, List, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  AddRuleAction,
  ApplyRuleAction,
  TogglePinRuleAction,
  EditRuleAction,
  DeleteRuleAction,
  EditTagsAction,
} from "./action-panel-items";
import { applyRuleToFileSystem } from "./utils/vscode-utils";

import { Rule } from "./types";
import { fetchRulesFromStorage, deleteRuleFromStorage, toggleRulePinInStorage } from "./rule-storage";
import { restoreDefaultTagsInStorage, getTagsFilePath } from "./tag-storage";
import * as fs from "fs/promises";
import { constants } from "fs";
import { showFailureToast } from "./utils/utils";

(async () => {
  try {
    const tagsFilePath = getTagsFilePath();
    await fs.access(tagsFilePath, constants.F_OK);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      const result = await restoreDefaultTagsInStorage();
      if (result.restored) {
        console.log("Default tags restored successfully.");
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showFailureToast(errorMessage, { title: "Failed to restore tags" });
    }
  }
})();

export default function Command() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const fetchedRules = await fetchRulesFromStorage();
      fetchedRules.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
        }
        return a.title.localeCompare(b.title);
      });
      setRules(fetchedRules);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleDeleteRule = async (ruleToDelete: Rule) => {
    try {
      const updatedRules = await deleteRuleFromStorage(ruleToDelete);
      updatedRules.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
        }
        return a.title.localeCompare(b.title);
      });
      setRules(updatedRules);
    } catch (error) {
      console.error(error);
    }
  };

  const handleApplyRule = async (rule: Rule) => {
    try {
      await applyRuleToFileSystem(rule);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showFailureToast(errorMessage, { title: "Failed to apply rule" });
    }
  };

  const handleTogglePin = async (ruleToPin: Rule) => {
    try {
      const updatedRules = await toggleRulePinInStorage(ruleToPin);
      updatedRules.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
        }
        return a.title.localeCompare(b.title);
      });
      setRules(updatedRules);
    } catch (error) {
      console.error(error);
    }
  };

  const allTags = Array.from(new Set(rules.flatMap((rule) => rule.tags || [])));

  const filteredRules = rules.filter((rule) => {
    if (filter === "all") {
      return true;
    }
    if (filter === "pinned") {
      return rule.isPinned;
    }
    return rule.tags?.includes(filter);
  });

  const pinnedRules = filteredRules.filter((rule) => rule.isPinned);
  const unpinnedRules = filteredRules.filter((rule) => !rule.isPinned);

  const renderRuleItem = (rule: Rule) => (
    <List.Item
      key={rule.ruleIdentifier}
      title={rule.title}
      accessories={rule.isPinned ? [{ icon: Icon.Star, tooltip: "Pinned" }] : []}
      detail={
        <List.Item.Detail
          markdown={rule.content}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Rule Identifier" text={rule.ruleIdentifier} />
              <List.Item.Detail.Metadata.Label title="Mode Slug" text={rule.modeSlug} />
              {rule.comment || (rule.tags && rule.tags.length > 0) ? <List.Item.Detail.Metadata.Separator /> : null}
              {rule.tags && rule.tags.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {rule.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Green} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {rule.comment ? <List.Item.Detail.Metadata.Label title="Comment" text={rule.comment} /> : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ApplyRuleAction rule={rule} onApplyRule={handleApplyRule} />
          <TogglePinRuleAction rule={rule} onTogglePin={handleTogglePin} />
          <AddRuleAction
            onRuleAdded={(newRule) => {
              if (newRule) {
                setRules((prevRules) => {
                  const existingIndex = prevRules.findIndex(
                    (r) => r.ruleIdentifier === newRule.ruleIdentifier && r.modeSlug === newRule.modeSlug,
                  );
                  if (existingIndex > -1) {
                    const updatedRules = [...prevRules];
                    updatedRules[existingIndex] = newRule;
                    return updatedRules.sort((a, b) => {
                      if (a.isPinned !== b.isPinned) {
                        return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
                      }
                      return a.title.localeCompare(b.title);
                    });
                  } else {
                    return [...prevRules, newRule].sort((a, b) => {
                      if (a.isPinned !== b.isPinned) {
                        return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
                      }
                      return a.title.localeCompare(b.title);
                    });
                  }
                });
              }
            }}
          />
          <EditRuleAction rule={rule} onRuleAdded={fetchRules} />
          <DeleteRuleAction rule={rule} onDeleteRule={handleDeleteRule} />
          <EditTagsAction onPop={fetchRules} />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Filter" storeValue={true} onChange={(newValue) => setFilter(newValue)}>
          <List.Dropdown.Item title="All Items" value="all" />
          <List.Dropdown.Item title="Pinned" value="pinned" />
          {allTags.length > 0 && (
            <List.Dropdown.Section title="Tags">
              {allTags.map((tag) => (
                <List.Dropdown.Item key={tag} title={tag} value={tag} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <AddRuleAction
            onRuleAdded={(newRule) => {
              if (newRule) {
                setRules((prevRules) => {
                  const existingIndex = prevRules.findIndex(
                    (r) => r.ruleIdentifier === newRule.ruleIdentifier && r.modeSlug === newRule.modeSlug,
                  );
                  if (existingIndex > -1) {
                    const updatedRules = [...prevRules];
                    updatedRules[existingIndex] = newRule;
                    return updatedRules.sort((a, b) => {
                      if (a.isPinned !== b.isPinned) {
                        return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
                      }
                      return a.title.localeCompare(b.title);
                    });
                  } else {
                    return [...prevRules, newRule].sort((a, b) => {
                      if (a.isPinned !== b.isPinned) {
                        return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
                      }
                      return a.title.localeCompare(b.title);
                    });
                  }
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      {pinnedRules.length > 0 && <List.Section title="Pinned">{pinnedRules.map(renderRuleItem)}</List.Section>}

      {unpinnedRules.length > 0 && <List.Section title="Unpinned">{unpinnedRules.map(renderRuleItem)}</List.Section>}
      <List.EmptyView
        title="No rules found"
        description="Add a new rule to get started."
        actions={
          <ActionPanel>
            <AddRuleAction
              onRuleAdded={(newRule) => {
                if (newRule) {
                  setRules((prevRules) => {
                    const existingIndex = prevRules.findIndex(
                      (r) => r.ruleIdentifier === newRule.ruleIdentifier && r.modeSlug === newRule.modeSlug,
                    );
                    if (existingIndex > -1) {
                      const updatedRules = [...prevRules];
                      updatedRules[existingIndex] = newRule;
                      return updatedRules.sort((a, b) => {
                        if (a.isPinned !== b.isPinned) {
                          return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
                        }
                        return a.title.localeCompare(b.title);
                      });
                    } else {
                      return [...prevRules, newRule].sort((a, b) => {
                        if (a.isPinned !== b.isPinned) {
                          return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
                        }
                        return a.title.localeCompare(b.title);
                      });
                    }
                  });
                }
              }}
            />
            <EditTagsAction onPop={fetchRules} />
          </ActionPanel>
        }
      />
    </List>
  );
}
