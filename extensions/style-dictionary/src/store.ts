import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

export type DefaultAction = "value" | "name" | "template";
export type Project = {
  id: string;
  name: string;
  dirs: string[];
  templates?: string;
  defaultAction?: DefaultAction;
};
export type Pin = { path: string[]; group: boolean };

export function useStored<T>(key: string, initial: T) {
  const [value, setCached] = useCachedState<T>(`stored:${key}`, initial);
  useEffect(() => {
    LocalStorage.getItem<string>(key).then((s) => s !== undefined && setCached(JSON.parse(s)));
  }, [key]);
  const set = (v: T) => {
    setCached(v);
    return LocalStorage.setItem(key, JSON.stringify(v));
  };
  return [value, set] as const;
}

export const useProjects = () => useStored<Project[]>("projects", []);
export const useActiveProjectId = () => useStored<string>("activeProject", "");
export const usePins = (projectId: string) => useStored<(Pin | null)[]>(`pins:${projectId}`, []);
