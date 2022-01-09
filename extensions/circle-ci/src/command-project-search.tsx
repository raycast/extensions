import { getLocalStorageItem, List, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { circleCIListProjects } from "./circleci-functions";
import { ProjectListItem } from "./components/ProjectListItem";


const Command = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [projectURIs, setProjectURIs] = useState<string[]>([]);

  let temp: string[] = [];

  const restore = (list: string[]) => {
    setProjectURIs(list);
    setIsLoading(false);
  };

  const reload = () => Promise.resolve()
    .then(() => setIsLoading(true))
    .then(() => temp = projectURIs)
    .then(() => setProjectURIs([]))
    .then(() => circleCIListProjects())
    .then(list => cacheIfPulled({ list, cache: false }))
    .then(setProjectURIs)
    .then(() => setIsLoading(false))
    .catch(showErrorRestoreList(temp, restore));

  useEffect(() => {
    getCircleCIProjectFromCache()
      .then(pullIfNoCircleCIProjectsWereFound)
      .then(cacheIfPulled)
      .then(setProjectURIs)
      .then(() => setIsLoading(false))
      .catch(showErrorRestoreList(temp, restore));
  }, []);

  return <List isLoading={isLoading}>
    {
      projectURIs
        .map(uri => ({ uri, name: uri.replace(/^https?:\/\/[^/]+\//, "") }))
        .map(({ uri, name }) => <ProjectListItem key={uri} uri={uri} name={name} onReload={reload} />)
    }
  </List>;
};

// noinspection JSUnusedGlobalSymbols
export default Command;


const KEY_PROJECT_URIS = "project-uris";


const getCircleCIProjectFromCache = (): Promise<string[]> =>
  getLocalStorageItem(KEY_PROJECT_URIS)
    .then(serialized => {
      if (!serialized || typeof serialized !== "string") {
        return [];
      }

      const parsed = JSON.parse(serialized) as string[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed;
    });


const pullIfNoCircleCIProjectsWereFound = (list: string[]): Promise<{ list: string[], cache: boolean }> =>
  new Promise(resolve => {
    if (list.length > 0) {
      return resolve({ list, cache: true });
    }

    return circleCIListProjects()
      .then(list => resolve({ list, cache: false }));
  });


const cacheIfPulled = ({ list, cache }: { list: string[], cache: boolean }) =>
  cache
    ? list
    : setLocalStorageItem(KEY_PROJECT_URIS, JSON.stringify(list)).then(() => list);


const showErrorRestoreList =
  (list: string[], restore: (list: string[]) => void) =>
    (e: Error) => showToast(ToastStyle.Failure, e.message)
      .then(() => restore(list));
