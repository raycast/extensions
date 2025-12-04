import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { DateTime } from "luxon";
import fetch from "node-fetch";
import { useMemo } from "react";
import { AccessLogItem } from "../types/AccessLogItem";
import { ExivoComponent, ExivoComponentMode } from "../types/ExivoComponent";
import { getDoorModeTitle } from "../utils";

const ExivoConfig = {
  baseUrl: "https://api.exivo.io/v1",
};

const siteId = () => {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  return preferences.siteId;
};

export const useExivoClient = () => {
  const credentials = useMemo(() => {
    const preferences = getPreferenceValues<ExtensionPreferences>();
    return btoa(`${preferences.clientId}:${preferences.clientSecret}`);
  }, []);

  const getExivoComponents = () => {
    return useFetch<ExivoComponent[]>(`${ExivoConfig.baseUrl}/${siteId()}/component`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });
  };

  const getAccessLogs = () => {
    const from = DateTime.now().startOf("day").minus({ days: 3 }).toFormat("yyyy-MM-dd");
    return useFetch<AccessLogItem[]>(`${ExivoConfig.baseUrl}/${siteId()}/accesslog/component?from=${from}&limit=200`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });
  };

  const unlock = (componentId: string) => {
    showToast({ style: Toast.Style.Animated, title: "Unlocking door..." });
    return fetch(`${ExivoConfig.baseUrl}/${siteId()}/component/${componentId}/unlock`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    })
      .then(() => {
        showToast({
          style: Toast.Style.Success,
          title: "Door unlocked successfully!",
        });
      })
      .catch((error: { message: string }) => {
        showFailureToast(error, {
          title: "Failed to unlock door.",
          message: error.message,
        });
      });
  };

  const setMode = (componentId: string, mode: ExivoComponentMode, onSuccess: () => void) => {
    showToast({
      style: Toast.Style.Animated,
      title: "Setting mode for door...",
    });

    return fetch(`${ExivoConfig.baseUrl}/${siteId()}/component/${componentId}/mode`, {
      method: "POST",
      body: JSON.stringify({ mode }),
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    })
      .then(() => {
        onSuccess();
        showToast({
          style: Toast.Style.Success,
          title: `Set mode '${getDoorModeTitle(mode)}' successfully!`,
        });
      })
      .catch((error: { message: string }) => {
        showFailureToast(error, {
          title: "Failed to set mode for door.",
          message: error.message,
        });
      });
  };

  return { getAccessLogs, getExivoComponents, setMode, unlock };
};
