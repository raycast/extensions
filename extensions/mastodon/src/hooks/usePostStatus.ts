import { useState } from "react";
import { showToast, popToRoot, Toast } from "@raycast/api";
import { useCachedState, useForm } from "@raycast/utils";

import apiServer from "../utils/api";
import { MastodonError, StatusResponse, StatusRequest } from "../utils/types";
import { dateTimeFormatter, errorHandler } from "../utils/helpers";

import { LaunchContext } from "../post-simple-status";

export interface StatusFormValues extends StatusRequest {
  files: string[];
  description?: string;
  isMarkdown: boolean;
}

export function useSubmitStatus(draftValues: Partial<StatusRequest> | undefined, launchContext: LaunchContext) {
  const [openActionText, setOpenActionText] = useState("View the latest published status");

  const [latestStatus, setLatestStatus] = useCachedState<StatusResponse>("latest_published_status");

  const validator = (value: StatusFormValues) => {
    if (value.status.trim().length === 0 && value.files.length === 0)
      throw new Error("You might forget the content, right ? ");
    if (value.scheduled_at) {
      const now = Date.now();
      const scheduled = new Date(value.scheduled_at);
      if (scheduled.getTime() - now < 300000) {
        throw new Error("The scheduled time must be >= 5 minutes.");
      }
    }
  };

  const { handleSubmit, itemProps, focus } = useForm<StatusFormValues>({
    onSubmit: async (value: StatusFormValues) => {
      try {
        validator(value);
        showToast(Toast.Style.Animated, launchContext ? "Updating status..." : "Publishing to the Fediverse ...");

        const mediaIds = await Promise.all(
          value.files?.map(async (file: string) => {
            const { id } = await apiServer.uploadAttachment({ file, description: value.description });
            return id;
          }) ?? [],
        );

        const newStatus: Partial<StatusRequest> = {
          ...value,
          media_ids: mediaIds,
          content_type: value.isMarkdown ? "text/markdown" : "text/plain",
        };

        let response;
        switch (launchContext?.action) {
          case "edit":
            response = await apiServer.editStatus(launchContext.status.id, {
              ...newStatus,
              visibility: launchContext.status.visibility,
            });
            break;
          case "reply":
            response = await apiServer.postNewStatus({ ...newStatus, in_reply_to_id: launchContext.status.id });
            break;
          default:
            response = await apiServer.postNewStatus(newStatus);
            break;
        }

        if (value.scheduled_at) {
          showToast(Toast.Style.Success, "Scheduled", dateTimeFormatter(value.scheduled_at, "long"));
        } else {
          showToast(Toast.Style.Success, launchContext ? "Status updated!" : "Status published! ");
        }

        setLatestStatus(response);
        setOpenActionText("View the status in Browser");
        setTimeout(() => popToRoot(), 2000);
      } catch (error) {
        errorHandler(error as MastodonError);
      }
    },
    initialValues: {
      ...draftValues,
      sensitive: false,
    },
  });

  return { handleSubmit, latestStatus, openActionText, itemProps, focus };
}
