import { useEffect } from "react";

import { useCachedState } from "@raycast/utils";
import { LocalStorage, showToast, Toast } from "@raycast/api";

import fetch from "node-fetch";

import { useLocalStorage } from "./useLocalStorage";

import { Instance } from "../types";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { getAuthHeader, persistInstance } from "../utils/auth";

const compareInstances = (a: Instance, b: Instance): number => {
  const nameA = a.alias ? a.alias : a.name;
  const nameB = b.alias ? b.alias : b.name;
  return nameA.localeCompare(nameB);
};

export default function useInstances() {
  const [selectedInstance, setSelectedInstance] = useCachedState<Instance>("instance");
  const [userId, setUserId] = useCachedState<string>("user-id");
  const [userName, setUserName] = useCachedState<string>("user-name");

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
      const { name = "", alias } = selectedInstance;
      const instanceLabel = alias || name;

      try {
        const authorization = await getAuthHeader(selectedInstance);
        const response = await fetch(`${getInstanceBaseUrl(selectedInstance)}/api/now/ui/user/current_user`, {
          method: "GET",
          headers: {
            Authorization: authorization,
          },
        });

        const jsonData = (await response.json()) as {
          result?: { user_sys_id?: string; user_name?: string };
          error?: { message: string };
        };

        if (!jsonData.result?.user_sys_id) {
          const message = jsonData.error?.message || `HTTP ${response.status}`;
          showToast({
            style: Toast.Style.Failure,
            title: `Could not connect to ${instanceLabel}`,
            message,
          });
          await persistInstance({ ...selectedInstance, authError: message, authErrorAt: Date.now() });
          await mutate();
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
          title: `Could not connect to ${instanceLabel}`,
          message,
        });
        await persistInstance({ ...selectedInstance, authError: message, authErrorAt: Date.now() });
        await mutate();
      }
    };
    fetchUserId().then((result) => {
      if (result) {
        setUserId(result.sysId);
        setUserName(result.userName);
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
    userName,
  };
}
