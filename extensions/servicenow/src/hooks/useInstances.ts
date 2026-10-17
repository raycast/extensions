import { useEffect } from "react";

import { useCachedState } from "@raycast/utils";
import { LocalStorage, showToast, Toast } from "@raycast/api";

import { useLocalStorage } from "./useLocalStorage";

import { Instance } from "../types";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { instanceLabel } from "../utils/instanceLabel";
import { getAuthHeader, persistInstance } from "../utils/auth";

const compareInstances = (a: Instance, b: Instance): number => {
  return instanceLabel(a).localeCompare(instanceLabel(b));
};

const TRANSIENT_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNABORTED",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

// True when the error is a network blip or a non-JSON body (e.g. HTML login/maintenance
// page). These should surface as a toast but must NOT mark the instance as having a
// credential failure — that state blocks the UI and requires the user to re-authenticate.
const isTransientError = (error: unknown): boolean => {
  if (error instanceof SyntaxError) return true;
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string" && TRANSIENT_NETWORK_CODES.has(code)) return true;
  }
  return false;
};

export default function useInstances() {
  const [selectedInstance, setSelectedInstance] = useCachedState<Instance>("instance");
  const [userId, setUserId] = useCachedState<string>("user-id");
  const [currentUserName, setCurrentUserName] = useCachedState<string>("user-name");

  const { value, setValue, mutate, isLoading } = useLocalStorage<Instance[]>("saved-instances", []);

  async function addInstance(instance: Instance) {
    setValue([...value, instance]);
    if (value.length === 0) {
      setSelectedInstance(instance);
      LocalStorage.setItem("selected-instance", JSON.stringify(instance));
    }
  }

  async function editInstance(instance: Instance) {
    setValue(value.map((i) => (i.id === instance.id ? instance : i)));
    if (selectedInstance?.id === instance.id) {
      setSelectedInstance(instance);
      LocalStorage.setItem("selected-instance", JSON.stringify(instance));
    }
  }

  async function deleteInstance(instanceId: string) {
    const selectedInstanceId = selectedInstance?.id;
    setValue(value.filter((i) => i.id !== instanceId));
    if (selectedInstanceId === instanceId) {
      setSelectedInstance(undefined);
      LocalStorage.removeItem("selected-instance");
    }
  }

  useEffect(() => {
    if (!selectedInstance) {
      return;
    }

    const fetchUserId = async () => {
      try {
        const authorization = await getAuthHeader(selectedInstance, {
          onRefresh: async (updated) => {
            setSelectedInstance(updated);
            await mutate();
          },
        });
        const response = await fetch(`${getInstanceBaseUrl(selectedInstance)}/api/now/ui/user/current_user`, {
          method: "GET",
          headers: {
            Authorization: authorization,
            Accept: "application/json",
          },
        });

        let jsonData: {
          result?: { user_sys_id?: string; user_name?: string };
          error?: { message: string };
        };
        try {
          jsonData = (await response.json()) as typeof jsonData;
        } catch (parseError) {
          // Non-JSON body — usually an HTML login or maintenance page. Treat as
          // transient (no persisted authError) so the instance isn't flagged as broken.
          console.error(parseError);
          showToast({
            style: Toast.Style.Failure,
            title: `Could not connect to ${instanceLabel(selectedInstance)}`,
            message: `Unexpected response (HTTP ${response.status})`,
          });
          return undefined;
        }

        if (!jsonData.result?.user_sys_id) {
          const message = jsonData.error?.message || `HTTP ${response.status}`;
          showToast({
            style: Toast.Style.Failure,
            title: `Could not connect to ${instanceLabel(selectedInstance)}`,
            message,
          });
          if (response.status === 401 || response.status === 403) {
            await persistInstance({ ...selectedInstance, authError: message, authErrorAt: Date.now() });
            await mutate();
          }
          return undefined;
        }

        if (selectedInstance.authError) {
          await persistInstance({ ...selectedInstance, authError: undefined, authErrorAt: undefined });
          await mutate();
        }

        return { sysId: jsonData.result.user_sys_id, userName: jsonData.result.user_name ?? "" };
      } catch (error) {
        console.error(error);

        const message = error instanceof Error ? error.message : String(error);
        showToast({
          style: Toast.Style.Failure,
          title: `Could not connect to ${instanceLabel(selectedInstance)}`,
          message,
        });
        if (!isTransientError(error)) {
          await persistInstance({ ...selectedInstance, authError: message, authErrorAt: Date.now() });
          await mutate();
        }
      }
    };
    fetchUserId().then((result) => {
      if (result) {
        setUserId(result.sysId);
        setCurrentUserName(result.userName);
      }
    });
  }, [selectedInstance]);

  return {
    instances: value.sort((a, b) => compareInstances(a, b)),
    addInstance,
    editInstance,
    deleteInstance,
    mutate,
    isLoading,
    selectedInstance,
    setSelectedInstance,
    userId,
    currentUserName,
  };
}
