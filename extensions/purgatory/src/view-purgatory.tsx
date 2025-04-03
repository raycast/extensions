import { List, ActionPanel, Action } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";

export default function Command() {
  const purgatoryPath = path.join(os.homedir(), "purgatory.md");
  const fileExists = fs.existsSync(purgatoryPath);
  const content = fileExists ? fs.readFileSync(purgatoryPath, "utf8") : "";
  const entries = content
    .split("### ")
    .filter((e) => e.trim() !== "")
    .map((e) => {
      const lines = e.trim().split("\n");
      const timestamp = lines[0]?.trim();
      const mainLine =
        lines
          .find((line) => /^- /.test(line))
          ?.slice(2)
          .trim() || "(No main entry)";
      return {
        timestamp,
        text: mainLine,
      };
    })
    .reverse();

  return (
    <List searchBarPlaceholder="Search Purgatory...">
      {entries.map((entry, index) => (
        <List.Item
          key={index}
          title={entry.text}
          subtitle={entry.timestamp}
          actions={
            <ActionPanel>
              <Action
                title="Open in Xcode"
                onAction={() => {
                  exec(`open "${purgatoryPath}"`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
