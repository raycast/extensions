import { homedir } from "os";
import { executeSQL } from "@raycast/utils";
import { AppBaseUrls, DataBasePath } from "./Defines";

export type DraftItem = {
  uuid: string;
  title: string;
  content: string;
  truncatedContent: string;
  created: number;
  modified: number;
  flagged: boolean;
  openUrl: string;
  mdTitleLink: string;
};

const DRAFTS_DB = DataBasePath.replace("~", homedir());

export async function getDrafts(filterString?: string, filterTitleOnly?: boolean) {
  filterString = filterString || "";
  let conditionString = "";
  if (filterString !== "" && filterTitleOnly) {
    conditionString = `AND LOWER(SUBSTR(ZCONTENT, 1, INSTR(ZCONTENT, CHAR(10)) - 1)) LIKE '%${filterString}%'`;
  } else if (filterString !== "" && !filterTitleOnly) {
    conditionString = `AND LOWER(ZCONTENT) LIKE '%${filterString}%'`;
  } else {
    conditionString = "";
  }

  const dQuery = `
    SELECT
        ZUUID as uuid,
        ZCONTENT as content,
        ZCREATED_AT as created,
        ZCHANGED_AT as modified, 
        ZFLAGGED as flagged
    FROM 
        ZMANAGEDDRAFT 
    WHERE 
        ZFOLDER != 10000
        ${conditionString}
    ORDER BY 
        ZCHANGED_AT DESC
    `;

  const dData = await executeSQL<DraftItem>(DRAFTS_DB, dQuery);

  if (!dData || dData.length === 0) {
    return [];
  }

  const alreadyFound: { [key: string]: boolean } = {};

  const drafts = dData
    .filter((draft) => {
      const found = alreadyFound[draft.uuid];
      if (!found) alreadyFound[draft.uuid] = true;
      return !found;
    })
    .map((draft) => {
      const firstLine = draft.content.split("\n")[0] || "";
      const title = firstLine.replace(/^#* /, "");
      let truncatedContent = draft.content.split("\n").slice(1).join("\n").trim();
      truncatedContent = truncatedContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .slice(0, 2)
        .join("\n");

      const maxLength = 100;
      if (truncatedContent.length > maxLength) {
        truncatedContent = truncatedContent.substring(0, maxLength) + "...";
      }

      const openUrl = AppBaseUrls.OPEN_DRAFT + "uuid=" + draft.uuid;
      const mdTitleLink = `[${title}](${openUrl})`;

      return {
        ...draft,
        title,
        truncatedContent,
        openUrl,
        mdTitleLink,
      };
    })
    .sort((a, b) => (a.modified && b.modified && a.modified < b.modified ? 1 : -1));

  return drafts;
}
