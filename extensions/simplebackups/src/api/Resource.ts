import { showToast, Toast, environment } from "@raycast/api";
import fetch from "node-fetch";
import { SB_API_URL } from "../config";
import { requestHeaders } from "../helpers";
import { BackupRunResponse, BackupsResponse, BackupState, IResource } from "../types";

if (environment.isDevelopment) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const Resource = {
  async run(backup: IResource, refreshHandler: () => void) {
    const headers = requestHeaders();
    const toast = await showToast({ style: Toast.Style.Animated, title: "Triggering backup run..." });

    try {
      const response = await fetch(`${SB_API_URL}/backup/${backup.id}/run`, {
        method: "get",
        headers,
      });

      if (response.status === 401) {
        throw new Error("Error authenticating with SimpleBackups API - invalid API token");
      } else if (response.status < 200 || response.status >= 300) {
        throw new Error(`Error triggering backup: ${response.statusText}`);
      }

      const backupRunResponse = ((await response.json()) as BackupRunResponse) ?? [];

      if (backup.last_file_backup) {
        backup.last_file_backup.status = "running" as BackupState;
      }

      if (backup.last_db_backup) {
        backup.last_db_backup.status = "running" as BackupState;
      }
      refreshHandler();

      toast.style = backupRunResponse.success ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = backupRunResponse.message;
      toast.message = backupRunResponse.data.filename ?? "Unknown filename";
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not trigger backup!";
      toast.message = error?.message ?? "Unknown error";
      console.error(error);
    }
  },

  async pause(backup: IResource, refreshHandler: () => void) {
    const headers = requestHeaders();
    const toast = await showToast({ style: Toast.Style.Animated, title: "Pausing backup job..." });

    try {
      const response = await fetch(`${SB_API_URL}/backup/${backup.id}/pause`, {
        method: "patch",
        headers,
      });

      if (response.status === 401) {
        throw new Error("Error authenticating with SimpleBackups API - invalid API token");
      } else if (response.status < 200 || response.status >= 300) {
        throw new Error(`Error pausing backup: ${response.statusText}`);
      }

      const backupActionResponse = ((await response.json()) as BackupRunResponse) ?? [];

      backup.status = false;
      refreshHandler();
      toast.style = backupActionResponse.success ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = backupActionResponse.message;
      toast.message = backupActionResponse.data.filename ?? "Unknown filename";
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not pause backup!";

      console.error(error);
    }
  },

  async resume(backup: IResource, refreshHandler: () => void) {
    const headers = requestHeaders();
    const toast = await showToast({ style: Toast.Style.Animated, title: "Resuming backup job..." });

    try {
      const response = await fetch(`${SB_API_URL}/backup/${backup.id}/resume`, {
        method: "patch",
        headers,
      });

      if (response.status === 401) {
        throw new Error("Error authenticating with SimpleBackups API - invalid API token");
      } else if (response.status < 200 || response.status >= 300) {
        throw new Error(`Error resuming backup: ${response.statusText}`);
      }

      const backupActionResponse = ((await response.json()) as BackupRunResponse) ?? [];

      backup.status = true;
      refreshHandler();
      toast.style = backupActionResponse.success ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = backupActionResponse.message;
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not resume backup!";
      toast.message = error?.message ?? "Unknown error";
      console.error(error);
    }
  },
};
