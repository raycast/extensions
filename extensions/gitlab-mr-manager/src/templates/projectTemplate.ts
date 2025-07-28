import { Project } from "../types/gitlab";

export const generateProjectMarkdown = (project: Project): string => {
  return `# 📁 ${project.name}

---

## 🏢 Project Information
| Field | Value |
|-------|-------|
| **🆔 Project ID** | \`${project.id}\` |
| **📂 Namespace** | \`${project.path_with_namespace}\` |
| **🌐 GitLab URL** | [🔗 Open in GitLab](${project.web_url}) |

---

## 📋 Description
${project.description ? project.description : "> *No description provided for this project*"}

---

## 🚀 Quick Actions
- **⚡ View Merge Requests** - See all open MRs for this project
- **🌐 Open in GitLab** - Access the full project in your browser
- **📋 Copy URL** - Get the project link for sharing

---
*💡 Press **Enter** to explore merge requests for this project*`;
};
