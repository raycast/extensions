import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getGatewayClient } from "./lib/gateway-client";
import type { SkillEntry } from "./lib/types";

type FilterType = "all" | "ready" | "needs-setup" | "disabled";

interface SkillsState {
  loading: boolean;
  error?: string;
  skills: SkillEntry[];
}

// Skill is considered "active" if enabled and ready to use
function isSkillActive(skill: SkillEntry): boolean {
  return !skill.disabled && skill.eligible;
}

// Skill needs setup if enabled but missing requirements
function needsSetup(skill: SkillEntry): boolean {
  if (skill.disabled) return false;
  if (skill.eligible) return false;
  const m = skill.missing;
  return Boolean(
    m?.bins?.length ||
    m?.anyBins?.length ||
    m?.env?.length ||
    m?.config?.length ||
    m?.os?.length,
  );
}

function getSkillStatusIcon(skill: SkillEntry): Icon {
  if (skill.disabled) return Icon.Circle; // Empty circle = off
  if (skill.eligible) return Icon.CheckCircle; // Check = ready
  if (needsSetup(skill)) return Icon.ExclamationMark; // Warning = needs setup
  return Icon.QuestionMark;
}

function getSkillStatusColor(skill: SkillEntry): Color {
  if (skill.disabled) return Color.SecondaryText;
  if (skill.eligible) return Color.Green;
  if (needsSetup(skill)) return Color.Orange;
  return Color.Yellow;
}

function getSkillStatusText(skill: SkillEntry): string {
  if (skill.disabled) return "Off";
  if (skill.eligible) return "Ready";
  if (needsSetup(skill)) return "Needs Setup";
  return "Unknown";
}

function getMissingRequirements(skill: SkillEntry): string[] {
  const missing: string[] = [];
  const m = skill.missing;
  if (m?.bins?.length) {
    missing.push(`Install: ${m.bins.join(", ")}`);
  }
  if (m?.anyBins?.length) {
    missing.push(`Install one of: ${m.anyBins.join(", ")}`);
  }
  if (m?.env?.length) {
    missing.push(`Set env: ${m.env.join(", ")}`);
  }
  if (m?.config?.length) {
    missing.push(`Configure: ${m.config.join(", ")}`);
  }
  if (m?.os?.length) {
    missing.push(`Requires OS: ${m.os.join(", ")}`);
  }
  return missing;
}

export default function SkillsCommand() {
  const [state, setState] = useState<SkillsState>({
    loading: true,
    skills: [],
  });
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchText, setSearchText] = useState("");

  const loadSkills = async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }));

    try {
      const client = getGatewayClient();
      await client.connect();
      const result = await client.skillsStatus();

      setState({
        loading: false,
        skills: result.skills || [],
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load skills";
      setState({
        loading: false,
        skills: [],
        error: message,
      });
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Skills",
        message,
      });
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const enableSkill = async (skill: SkillEntry) => {
    showToast({
      style: Toast.Style.Animated,
      title: `Enabling ${skill.name}...`,
    });

    try {
      const client = getGatewayClient();
      await client.skillsUpdate(skill.skillKey, true); // true = enable

      showToast({
        style: Toast.Style.Success,
        title: `${skill.name} Enabled`,
        message: skill.eligible ? "Ready to use" : "May need additional setup",
      });

      await loadSkills();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to enable skill";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Enable",
        message,
      });
    }
  };

  const disableSkill = async (skill: SkillEntry) => {
    showToast({
      style: Toast.Style.Animated,
      title: `Disabling ${skill.name}...`,
    });

    try {
      const client = getGatewayClient();
      await client.skillsUpdate(skill.skillKey, false); // false = disable

      showToast({
        style: Toast.Style.Success,
        title: `${skill.name} Disabled`,
      });

      await loadSkills();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to disable skill";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Disable",
        message,
      });
    }
  };

  const filteredSkills = state.skills.filter((skill) => {
    switch (filter) {
      case "ready":
        if (!skill.eligible || skill.disabled) return false;
        break;
      case "needs-setup":
        if (!needsSetup(skill)) return false;
        break;
      case "disabled":
        if (!skill.disabled) return false;
        break;
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      const matchName = skill.name.toLowerCase().includes(search);
      const matchKey = skill.skillKey?.toLowerCase().includes(search);
      const matchDesc = skill.description?.toLowerCase().includes(search);
      if (!matchName && !matchKey && !matchDesc) return false;
    }

    return true;
  });

  // Sort: Ready first, then needs setup, then disabled
  const sortedSkills = [...filteredSkills].sort((a, b) => {
    const aScore = a.disabled ? 2 : a.eligible ? 0 : 1;
    const bScore = b.disabled ? 2 : b.eligible ? 0 : 1;
    if (aScore !== bScore) return aScore - bScore;
    return a.name.localeCompare(b.name);
  });

  const readyCount = state.skills.filter((s) => isSkillActive(s)).length;
  const needsSetupCount = state.skills.filter((s) => needsSetup(s)).length;
  const disabledCount = state.skills.filter((s) => s.disabled).length;

  return (
    <List
      isLoading={state.loading}
      searchBarPlaceholder="Search skills..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Skills"
          value={filter}
          onChange={(value) => setFilter(value as FilterType)}
        >
          <List.Dropdown.Item
            title={`All Skills (${state.skills.length})`}
            value="all"
          />
          <List.Dropdown.Item title={`Ready (${readyCount})`} value="ready" />
          <List.Dropdown.Item
            title={`Needs Setup (${needsSetupCount})`}
            value="needs-setup"
          />
          <List.Dropdown.Item
            title={`Disabled (${disabledCount})`}
            value="disabled"
          />
        </List.Dropdown>
      }
    >
      {state.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Skills"
          description={state.error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={loadSkills}
              />
            </ActionPanel>
          }
        />
      ) : sortedSkills.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Skills Found"
          description={
            searchText
              ? "Try a different search term"
              : "No skills match the filter"
          }
        />
      ) : (
        <List.Section title="Skills" subtitle={`${readyCount} ready`}>
          {sortedSkills.map((skill, index) => {
            const reactKey = skill.skillKey || skill.name || `skill-${index}`;
            const missing = getMissingRequirements(skill);
            const isDisabled = skill.disabled;

            // Build subtitle
            let subtitle = "";
            if (isDisabled) {
              subtitle = "Tap to enable";
            } else if (missing.length > 0) {
              subtitle = missing[0]; // Show first missing requirement
            } else if (skill.description) {
              subtitle =
                skill.description.length > 50
                  ? skill.description.slice(0, 50) + "..."
                  : skill.description;
            }

            const accessories: List.Item.Accessory[] = [];

            // Source tag
            if (skill.source) {
              accessories.push({
                tag: { value: skill.source, color: Color.SecondaryText },
              });
            }

            // API key indicator
            if (skill.primaryEnv) {
              const hasKey = !skill.missing?.env?.includes(skill.primaryEnv);
              accessories.push({
                icon: hasKey
                  ? { source: Icon.Key, tintColor: Color.Green }
                  : { source: Icon.Key, tintColor: Color.SecondaryText },
                tooltip: hasKey ? "API key configured" : "API key needed",
              });
            }

            // Status tag
            accessories.push({
              tag: {
                value: getSkillStatusText(skill),
                color: getSkillStatusColor(skill),
              },
            });

            return (
              <List.Item
                key={reactKey}
                icon={{
                  source: getSkillStatusIcon(skill),
                  tintColor: getSkillStatusColor(skill),
                }}
                title={`${skill.emoji || ""} ${skill.name}`.trim()}
                subtitle={subtitle}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {/* Primary action based on state */}
                      {isDisabled ? (
                        <Action
                          title="Enable Skill"
                          icon={{
                            source: Icon.CheckCircle,
                            tintColor: Color.Green,
                          }}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                          onAction={() => enableSkill(skill)}
                        />
                      ) : (
                        <Action
                          title="Disable Skill"
                          icon={{
                            source: Icon.XMarkCircle,
                            tintColor: Color.Red,
                          }}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => disableSkill(skill)}
                        />
                      )}
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={loadSkills}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Info">
                      {skill.homepage && (
                        <Action.OpenInBrowser
                          title="Open Homepage"
                          url={skill.homepage}
                          shortcut={{ modifiers: ["cmd"], key: "o" }}
                        />
                      )}
                      {skill.filePath && (
                        <Action.Open
                          title="Open Skill Folder"
                          target={skill.baseDir || skill.filePath}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                        />
                      )}
                      {skill.description && (
                        <Action.CopyToClipboard
                          title="Copy Description"
                          content={skill.description}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      )}
                      {skill.filePath && (
                        <Action.CopyToClipboard
                          title="Copy File Path"
                          content={skill.filePath}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                      )}
                      <Action.CopyToClipboard
                        title="Copy Skill Key"
                        content={skill.skillKey || skill.name}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
                detail={
                  <List.Item.Detail
                    markdown={[
                      `## ${skill.emoji || ""} ${skill.name}`,
                      "",
                      skill.description || "_No description available._",
                      "",
                      isDisabled
                        ? "### Status: Disabled\n\nThis skill is turned off. Enable it to use."
                        : missing.length > 0
                          ? `### ⚠️ Setup Required\n\n${missing.map((m) => `- ${m}`).join("\n")}`
                          : "### ✅ Ready\n\nThis skill is enabled and ready to use.",
                      "",
                      skill.homepage
                        ? `[View Documentation →](${skill.homepage})`
                        : "",
                    ]
                      .filter(Boolean)
                      .join("\n")}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={getSkillStatusText(skill)}
                            color={getSkillStatusColor(skill)}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        {skill.source && (
                          <List.Item.Detail.Metadata.Label
                            title="Source"
                            text={skill.source}
                          />
                        )}
                        {skill.primaryEnv && (
                          <List.Item.Detail.Metadata.Label
                            title="API Key"
                            text={
                              skill.missing?.env?.includes(skill.primaryEnv)
                                ? `Missing (${skill.primaryEnv})`
                                : "Configured"
                            }
                            icon={
                              skill.missing?.env?.includes(skill.primaryEnv)
                                ? {
                                    source: Icon.XMarkCircle,
                                    tintColor: Color.Orange,
                                  }
                                : {
                                    source: Icon.CheckCircle,
                                    tintColor: Color.Green,
                                  }
                            }
                          />
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Skill Key"
                          text={skill.skillKey || skill.name}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
