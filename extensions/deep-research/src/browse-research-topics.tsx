import { ActionPanel, Action, List, Icon, confirmAlert, Alert } from "@raycast/api";
import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import { useEffect, useState } from "react";

interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  learnings: string[];
  questions: string[];
  goals: string[];
}

function formatTitle(filename: string): string {
  const baseName = path.basename(filename, ".json");
  const words = baseName.split(/[-_]/);
  const title = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  return title;
}

export default function Command() {
  const supportPath = environment.supportPath;
  const [files, setFiles] = useState<string[]>([]);

  const loadFiles = () => {
    const fileList = fs.readdirSync(supportPath).filter((file) => file.endsWith(".json"));
    setFiles(fileList);
  };

  useEffect(() => {
    loadFiles();
  }, [supportPath]);

  const deleteFile = async (file: string) => {
    const filePath = path.join(supportPath, file);
    await confirmAlert({
      title: "Delete File",
      message: `Are you sure you want to delete "${file}"?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: () => {
          fs.unlinkSync(filePath);
          loadFiles();
        },
      },
    });
  };

  return (
    <List isShowingDetail={files.length != 0}>
      {files.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Research"
          description="Use @research in Raycast AI to get started"
        />
      ) : (
        files.map((file) => {
          const filePath = path.join(supportPath, file);
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const thoughts: ThoughtData[] = fileContent
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line) as ThoughtData);

          return (
            <List.Item
              key={file}
              title={formatTitle(file)}
              detail={
                <List.Item.Detail
                  markdown={`# ${formatTitle(file)}\n\`${file}\`\n\n${thoughts
                    .map((thought) => {
                      const learnings =
                        thought.learnings && thought.learnings.length > 0
                          ? thought.learnings.map((learning) => `- ${learning}`).join("\n")
                          : "> No learnings";
                      const questions =
                        thought.questions && thought.questions.length > 0
                          ? thought.questions.map((question) => `- ${question}`).join("\n")
                          : "> No questions";
                      const goals =
                        thought.goals && thought.goals.length > 0
                          ? thought.goals.map((goal) => `- ${goal}`).join("\n")
                          : "> No goals";

                      return `## Thought ${thought.thoughtNumber}/${thought.totalThoughts}\n\n${thought.thought}\n\n**Learnings:**\n${learnings}\n\n**Questions:**\n${questions}\n\n**Goals:**\n${goals}`;
                    })
                    .join("\n\n")}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action.ShowInFinder path={filePath} title="Show File in Finder" />
                  <Action
                    title="Delete File"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await deleteFile(file);
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
