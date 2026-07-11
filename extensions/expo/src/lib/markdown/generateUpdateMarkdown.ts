import { UpdatesByGroupItem } from "../types/update.types";
import { changeCase, humanDateTime } from "../utils";

function getTitle(update: UpdatesByGroupItem) {
  return `Update: ${changeCase(update.message, "sentence")}`;
}

export default function generateUpdateMarkdown(update: UpdatesByGroupItem): string {
  if (!update) return ``;

  return `
## ${getTitle(update)}


| **PROPERTY**      | **VALUE**       |
|-------------------|-----------------|
| Group ID          | ${update.group} |
| Branch            | ${update.branch} |
| Runtime Version   | ${update.updateRuntime} |
| Commit            | ${update.updateGitCommitHash} |
| Created By        | ${update.actor.displayName} |
| Created at        | ${humanDateTime(new Date(update.createdAt))} |
| Updated at        | ${humanDateTime(new Date(update.updatedAt))} |

`;
}
