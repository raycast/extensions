import { homedir } from "os";
import { executeSQL } from "@raycast/utils";
import { DataBasePath } from "./Defines";

export type DraftItem = {
  uuid: string;
  title: string;
  content: string;
  truncatedContent: string;
  created: number;
  modified: number;
  flagged: boolean;
};

export type DraftAction = {
  uuid: string;
  name: string;
  actionDescription?: string;
  executedAt?: string;
};

export type DraftActionGroup = {
  uuid: string;
  name: string;
  hidden: boolean;
  modified: number;
  created: number;
  actionData: string;
};

const DRAFTS_DB = DataBasePath.replace("~", homedir());

export async function getAllActions() {
  const agQuery = `
    SELECT
        ZNAME as name,	
        ZHIDDEN as hidden,
        ZVISIBILITY,
        ZCREATED_AT as created,
        ZMODIFIED_AT as modified,
        ZSORT_INDEX,
        ZACTIONDATA as actionData,
        ZCHANGE_TAG,
        ZUUID as uuid
    FROM 
        ZMANAGEDACTIONGROUP
    WHERE ZHIDDEN != 1
    `;

  const agData = await executeSQL<DraftActionGroup>(DRAFTS_DB, agQuery);

  if (!agData || agData.length === 0) {
    console.log("No actions found");
    return [];
  }

  const alreadyFound: { [key: string]: boolean } = {};

  const actions = agData.flatMap((actionGroup) => {
    if (!alreadyFound[actionGroup.uuid]) {
      alreadyFound[actionGroup.uuid] = true;

      let parsedActions: DraftAction[] = [];
      try {
        // If actionData is a JSON string
        parsedActions = JSON.parse(actionGroup.actionData) as DraftAction[];
      } catch (error) {
        console.error("Failed to parse action data", error);
        return [];
      }

      return parsedActions.map((action) => ({
        uuid: action.uuid,
        name: action.name,
        actionDescription: action.actionDescription,
      }));
    }
    return [];
  });

  return actions;
}
