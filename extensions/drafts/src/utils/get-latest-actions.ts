import { homedir } from "os";
import { executeSQL } from "@raycast/utils";
import { DataBasePath } from "./Defines";
import { DraftAction } from "./get-all-actions";

const DRAFTS_DB = DataBasePath.replace("~", homedir());

export async function getLatestActions() {
  const agQuery = `
    SELECT
        name,
        uuid,
        executedAt
    FROM (
        SELECT
            ZACTION_NAME as name,
            ZACTION_UUID as uuid,
            ZEXECUTED_AT as executedAt,
            ROW_NUMBER() OVER (PARTITION BY ZACTION_UUID ORDER BY ZEXECUTED_AT DESC) as rn
        FROM 
            ZMANAGEDACTIONREQUEST
        WHERE 
            ZHIDDEN != 1
    ) AS RankedActions
    WHERE 
        rn = 1
    ORDER BY 
        executedAt DESC;
    `;

  const agData = await executeSQL<DraftAction>(DRAFTS_DB, agQuery);

  if (!agData || agData.length === 0) {
    console.log("No actions found");
    return [];
  }

  const alreadyFound: { [key: string]: boolean } = {};

  const actions = agData.flatMap((action) => {
    if (!alreadyFound[action.uuid]) {
      alreadyFound[action.uuid] = true;

      return action;
    }
    return [];
  });

  return actions;
}
