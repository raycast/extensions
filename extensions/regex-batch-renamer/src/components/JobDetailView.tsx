import { Action, ActionPanel, Detail } from "@raycast/api";
import { RenameJob } from "../types";
import EditJobForm from "./EditJobForm";

interface JobDetailViewProps {
  job: RenameJob;
  onJobUpdated: () => void;
}

export default function JobDetailView({ job, onJobUpdated }: JobDetailViewProps) {
  const markdown = `
# ${job.name}

${job.description ? `**Description:** ${job.description}` : ""}

**Created:** ${job.createdAt.toLocaleDateString()} at ${job.createdAt.toLocaleTimeString()}
**Updated:** ${job.updatedAt.toLocaleDateString()} at ${job.updatedAt.toLocaleTimeString()}
**Rules:** ${job.rules.length}

---

## Regex Rules

${job.rules
  .map(
    (rule, index) => `
### Rule ${index + 1}: ${rule.description || rule.id}

- **Find:** \`${rule.find}\`
- **Replace:** \`${rule.replace || "(empty)"}\`
- **Flags:** \`${rule.flags || "g"}\`

---
`,
  )
  .join("")}

## Usage

1. Select files or folders in Finder
2. Run the "Run Rename Job" command
3. Select this job from the list
4. Preview and confirm the changes
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={job.name}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Job"
            icon="pencil"
            target={<EditJobForm job={job} onJobSaved={onJobUpdated} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.CopyToClipboard
            title="Copy Job Rules"
            content={job.rules.map((rule) => `${rule.find} → ${rule.replace} (${rule.flags})`).join("\n")}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
