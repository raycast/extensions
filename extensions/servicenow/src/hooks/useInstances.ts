import { useCachedState } from "@raycast/utils";
import { useLocalStorage } from "./useLocalStorage";
import { LocalStorage } from "@raycast/api";

export type Instance = {
  id: string;
  name: string;
  alias: string;
  color: string;
  username: string;
  password: string;
};

const compareInstances = (a: Instance, b: Instance): number => {
  const nameA = a.alias ? a.alias : a.name;
  const nameB = b.alias ? b.alias : b.name;
  return nameA.localeCompare(nameB);
};

export default function useInstances() {
  const [selectedInstance, setSelectedInstance] = useCachedState<Instance>("instance");

  const { value, setValue, mutate, isLoading } = useLocalStorage<Instance[]>("saved-instances", []);

  async function addInstance(instance: Instance) {
    setValue([...value, instance]);
    if (value.length === 0) {
      setSelectedInstance(instance);
      LocalStorage.setItem("selected-instance", instance.name);
    }
  }

  async function editInstance(instance: Instance) {
    setValue(value.map((i) => (i.id === instance.id ? instance : i)));
    if (selectedInstance?.id === instance.id) {
      setSelectedInstance(instance);
      LocalStorage.setItem("selected-instance", instance.name);
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

  return {
    instances: value.sort((a, b) => compareInstances(a, b)),
    addInstance,
    editInstance,
    deleteInstance,
    mutate,
    isLoading,
  };
}
