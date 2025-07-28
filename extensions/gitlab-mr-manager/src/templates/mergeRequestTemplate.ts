import { MergeRequest } from "../types/gitlab";
import { formatDate, getStateEmoji } from "../utils/formatting";

export const generateMergeRequestMarkdown = (mr: MergeRequest): string => {
  return `# 🔀 ${mr.title}

---

## 📊 Overview
| Field | Value |
|-------|-------|
| **🆔 MR ID** | \`!${mr.iid}\` |
| **📈 State** | ${getStateEmoji(mr.state)} |
| **👤 Author** | ${mr.author.name} (\`@${mr.author.username}\`) |
| **📅 Created** | ${formatDate(mr.created_at)} |
| **🔄 Updated** | ${formatDate(mr.updated_at)} |

## 🌿 Branch Information
| Type | Branch |
|------|--------|
| **📤 Source** | \`${mr.source_branch}\` |
| **📥 Target** | \`${mr.target_branch}\` |

${generateStatusSection(mr)}

---

## 📝 Description
${mr.description ? mr.description : "> *No description provided*"}

---
*💡 Use **Cmd+T** to copy title, **Enter** to open in GitLab*`;
};

const generateStatusSection = (mr: MergeRequest): string => {
  const hasStatus = mr.has_conflicts || mr.draft || mr.work_in_progress || mr.assignees.length > 0;

  if (!hasStatus) return "";

  let statusContent = "## 🚨 Status & Assignments\n";

  if (mr.has_conflicts) {
    statusContent += "⚠️ **Has Conflicts** - Requires resolution before merge\n";
  }

  if (mr.draft || mr.work_in_progress) {
    statusContent += "📝 **Draft/Work in Progress** - Not ready for review\n";
  }

  if (mr.assignees.length > 0) {
    const assigneeNames = mr.assignees.map((a) => `**${a.name}**`).join(", ");
    statusContent += `👥 **Assignees:** ${assigneeNames}\n`;
  }

  return statusContent;
};
