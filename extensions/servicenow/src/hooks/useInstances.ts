import { useEffect } from "react";

import { useCachedState } from "@raycast/utils";
import { LocalStorage, showToast, Toast } from "@raycast/api";

import fetch from "node-fetch";

import { useLocalStorage } from "./useLocalStorage";

import { Instance } from "../types";

const compareInstances = (a: Instance, b: Instance): number => {
  const nameA = a.alias ? a.alias : a.name;
  const nameB = b.alias ? b.alias : b.name;
  return nameA.localeCompare(nameB);
};

export default function useInstances() {
  const [selectedInstance, setSelectedInstance] = useCachedState<Instance>("instance");
  const [userId, setUserId] = useCachedState<string>("user-id");

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
      const { name: instanceName = "", username = "", password = "" } = selectedInstance;

      try {
        const response = await fetch(
          `https://${instanceName}.service-now.com/api/now/table/sys_user?sysparm_query=user_name=${username}`,
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
            },
          },
        );

        const jsonData = (await response.json()) as {
          result?: { sys_id: string }[];
          error?: { message: string };
        };

        if (!jsonData.result) {
          showToast({
            style: Toast.Style.Failure,
            title: `Could not connect to ${instanceName}`,
            message: jsonData.error?.message,
          });

          return "";
        }

        return jsonData.result[0].sys_id;
      } catch (error) {
        console.error(error);

        showToast({
          style: Toast.Style.Failure,
          title: `Could not connect to ${instanceName}`,
          message: error instanceof Error ? error.message : "",
        });
      }
    };
    fetchUserId().then((userId) => {
      if (userId) setUserId(userId);
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
  };
}
