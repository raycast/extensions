import { ActionPanel, Detail, Form, Action, useNavigation, LocalStorage, AI } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useEffect, useState } from "react";
import { exec } from "child_process";

export default function Command() {
  const { push } = useNavigation();
  const [gitPath, setGitPath] = useState<string>("");
  const [savedPaths, setSavedPaths] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPaths() {
      const pathsString = (await LocalStorage.getItem<string>("gitPaths")) || "[]";
      try {
        const paths = JSON.parse(pathsString) as string[];
        setSavedPaths(paths);
      } catch (error) {
        console.error("Error parsing saved paths:", error);
        setSavedPaths([]);
      }
    }
    fetchPaths();
  }, []);

  function handleSubmit() {
    push(<GenerateCommitMessage gitPath={gitPath} />);
  }

  function formatPath(path: string) {
    const parts = path.split("/");
    return parts.length > 1 ? parts.slice(-2).join("/") : path;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Commit Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="gitPath" title="Git Repository Path" value={gitPath} onChange={setGitPath}>
        {savedPaths.map((path) => (
          <Form.Dropdown.Item key={path} value={path} title={formatPath(path)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function GenerateCommitMessage({ gitPath }: { gitPath: string }) {
  const [gitDiff, setGitDiff] = useState<string>("");

  useEffect(() => {
    exec(`git -C "${gitPath}" diff`, (error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      setGitDiff(stdout);
    });
  }, [gitPath]);

  const prompt = `
You are a Git commit message generator. Given the git diff content below, generate a concise and descriptive commit message following these rules:

1. Summary line (50 chars or less):
-                Start with a capital letter
-                Use imperative mood ("Add", "Fix", "Update", not "Added", "Fixed", "Updated")
-                No period at the end
-                Be specific and meaningful

2. Detailed description (72 chars per line):
-                Leave one blank line after summary
-                Explain what and why vs. how
-                List major changes with bullet points
-                Include relevant issue/ticket numbers
-                Explain breaking changes if any

Git diff content:
${gitDiff}

Generate:
1. A "Commit Summary" line
2. A "Commit Message" section with bullet points
`;

  const { data, isLoading } = useAI(prompt, {
    creativity: 0,
    model: AI.Model.Anthropic_Claude_Sonnet,
    execute: !!gitDiff,
  });

  useEffect(() => {
    if (data) {
      console.log("AI Response:", data);
    }
  }, [data]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        data
          ? (() => {
              const lines = data
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
              let summary = "";
              let messages: string[] = [];
              let additionalInfo = "";

              const hasExplicitMarkers = lines.some(
                (line) => line.startsWith("Commit Summary:") || line.startsWith("Commit Message:"),
              );

              if (hasExplicitMarkers) {
                const summaryIndex = lines.findIndex((line) => line.startsWith("Commit Summary:"));
                if (summaryIndex !== -1) {
                  summary = lines[summaryIndex].replace("Commit Summary:", "").trim();
                }

                const messageStartIndex = lines.findIndex((line) => line.startsWith("Commit Message:"));
                if (messageStartIndex !== -1) {
                  messages = lines
                    .slice(messageStartIndex + 1)
                    .filter((line) => line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* "));
                }
              } else {
                summary =
                  lines.find(
                    (line) => line && !line.startsWith("-") && !line.startsWith("•") && !line.startsWith("*"),
                  ) || "";
                messages = lines.filter(
                  (line) => line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* "),
                );
              }

              const lastMessageIndex = messages.length > 0 ? lines.lastIndexOf(messages[messages.length - 1]) : -1;
              if (lastMessageIndex !== -1 && lastMessageIndex + 1 < lines.length) {
                additionalInfo = lines.slice(lastMessageIndex + 1).join(" ");
              }

              return `## Commit Summary
${summary}

## Commit Messages
${messages.join("\n")}

${additionalInfo ? `## Additional Information\n${additionalInfo}` : ""}`;
            })()
          : "Loading..."
      }
    />
  );
}
