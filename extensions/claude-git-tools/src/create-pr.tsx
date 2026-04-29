import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  getBranchHistory,
  addBranchHistory,
  removeBranchHistory,
} from "./storage";
import { launchTask } from "./task-manager";
import { TaskDetail } from "./task-detail";
import { RepoPicker } from "./repo-picker";
import { SkillGate, type SkillConfig } from "./skill-picker";

function BranchPicker({
  dirPath,
  skill,
  onBack,
}: {
  dirPath: string;
  skill: SkillConfig;
  onBack: () => void;
}) {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setHistory(await getBranchHistory(dirPath));
    setIsLoading(false);
  }, [dirPath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasSearch = searchText.length > 0;
  const filteredHistory = hasSearch
    ? history.filter((b) => b.toLowerCase().includes(searchText.toLowerCase()))
    : history;
  const showNewBranch = hasSearch && !history.includes(searchText);

  function formatBranchDisplay(branch: string): string {
    return branch.includes(" ") ? branch.split(/\s+/).join(" -> ") : branch;
  }

  async function handleSelect(branch: string) {
    await addBranchHistory(dirPath, branch);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating PR → ${branch}...`,
    });
    try {
      const task = await launchTask("create-pr", dirPath, "create-pr", {
        targetBranch: branch,
        skillName: skill.skillName,
        skillDir: skill.skillDir,
      });
      if (!task) return;
      toast.style = Toast.Style.Success;
      toast.title = "Create PR task started";
      push(<TaskDetail task={task} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start create PR";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Target branch (e.g. dev, main)..."
      navigationTitle="Select Target Branch"
    >
      {showNewBranch && (
        <List.Section title="New">
          <List.Item
            icon={Icon.Plus}
            title={formatBranchDisplay(searchText)}
            subtitle="Use as target branch"
            actions={
              <ActionPanel>
                <Action
                  title="Create Pr"
                  onAction={() => handleSelect(searchText)}
                />
                <Action
                  title="Back"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "[" }}
                  onAction={onBack}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {filteredHistory.length > 0 && (
        <List.Section
          title={hasSearch ? "Matching Branches" : "Recent Branches"}
        >
          {filteredHistory.map((branch) => (
            <List.Item
              key={branch}
              icon={Icon.Clock}
              title={formatBranchDisplay(branch)}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Pr"
                    onAction={() => handleSelect(branch)}
                  />
                  <Action
                    title="Remove"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      await removeBranchHistory(dirPath, branch);
                      await refresh();
                    }}
                  />
                  <Action
                    title="Back"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                    onAction={onBack}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function CreatePR() {
  return (
    <SkillGate command="create-pr">
      {(skill) => <CreatePRInner skill={skill} />}
    </SkillGate>
  );
}

function CreatePRInner({ skill }: { skill: SkillConfig }) {
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  if (selectedDir) {
    return (
      <BranchPicker
        dirPath={selectedDir}
        skill={skill}
        onBack={() => setSelectedDir(null)}
      />
    );
  }

  return (
    <RepoPicker
      primaryActionTitle="Select"
      onSelect={(fullPath) => setSelectedDir(fullPath)}
    />
  );
}
