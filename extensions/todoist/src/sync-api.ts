// This API is intended to be used for features
// that are not available within Todoist's REST API.
import crypto from "crypto";

import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

const preferences = getPreferenceValues();

export const todoistSyncApi = axios.create({
  baseURL: "https://api.todoist.com/sync/v9",
  headers: { authorization: `Bearer ${preferences.token}` },
});

let sync_token = "*";

export async function move(id: string, projectId: string) {
  const { data } = await todoistSyncApi.post("/sync", {
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

type Event = {
  id: string;
  event_date: string;
  event_type: "completed";
  extra_data: {
    content: string;
  };
};

export async function getActivity() {
  const { data } = await todoistSyncApi.get("/activity/get?event_type=completed");

  return data.events as Event[];
}
