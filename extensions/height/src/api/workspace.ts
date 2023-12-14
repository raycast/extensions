import fetch from "node-fetch";
import { getOAuthToken } from "../components/withHeightAuth";
import { ApiErrorResponse } from "../types/utils";
import { WorkspaceObject } from "../types/workspace";
import { ApiUrls } from "./helpers";

export async function getWorkspace() {
  const response = await fetch(ApiUrls.workspace, {
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    return (await response.json()) as WorkspaceObject;
  } else {
    throw new Error(((await response.json()) as ApiErrorResponse).error.message);
  }
}
