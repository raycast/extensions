// This API is intended to be used for features
// that are not available within Todoist's REST API.
import crypto from "crypto";

import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

const preferences = getPreferenceValues();

export const todoistSyncApi = axios.create({
  baseURL: "https://api.todoist.com/sync/v9/sync",
  headers: { authorization: `Bearer ${preferences.token}` },
});

let sync_token = "*";

export async function move(id: string, projectId: string) {
  const { data } = await todoistSyncApi.post("/", {
    sync_token,
    resource_types: ["all"],
    commands: [
      {
        type: "item_move",
        uuid: crypto.randomUUID(),
        args: { id, project_id: projectId },
      },
    ],
  });

  sync_token = data.sync_token;
}
