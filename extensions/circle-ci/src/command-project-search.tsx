import { getLocalStorageItem, List, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { circleCIListProjects } from "./circleci-functions";
import { ProjectListItem } from "./components/ProjectListItem";

const Command = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [projectURIs, setProjectURIs] = useState<string[]>([]);

  const reload = () =>
    Promise.resolve()
      .then(() => setIsLoading(true))
      .then(() => circleCIListProjects())
      .then((list) => cacheIfPulled({ list, cache: false }))
      .then(setProjectURIs)
      .then(() => setIsLoading(false))
      .then(() => showToast(ToastStyle.Success, "Project list refreshed!"))
      .catch(showErrorStopLoading(setIsLoading));

  useEffect(() => {
    getCircleCIProjectFromCache()
      .then(pullIfNoCircleCIProjectsWereFound)
      .then(cacheIfPulled)
      .then(setProjectURIs)
      .then(() => setIsLoading(false))
      .catch(showErrorStopLoading(setIsLoading));
  }, []);

  return (
    <List isLoading={isLoading}>
      {projectURIs
        .map((uri) => ({ uri, name: uri.replace(/^https?:\/\/[^/]+\//, "") }))
        .map(({ uri, name }) => (
          <ProjectListItem key={uri} uri={uri} name={name} onReload={reload} />
        ))}
    </List>
  );
};

// noinspection JSUnusedGlobalSymbols
export default Command;

const KEY_PROJECT_URIS = "project-uris";

const getCircleCIProjectFromCache = (): Promise<string[]> =>
  getLocalStorageItem(KEY_PROJECT_URIS).then((serialized) => {
    if (!serialized || typeof serialized !== "string") {
      return [];
    }

    const parsed = JSON.parse(serialized) as string[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  });

const pullIfNoCircleCIProjectsWereFound = (list: string[]): Promise<{ list: string[]; cache: boolean }> =>
  new Promise((resolve, reject) => {
    if (list.length > 0) {
      return resolve({ list, cache: true });
    }

    return circleCIListProjects()
      .then((list) => resolve({ list, cache: false }))
      .catch(reject);
  });

const cacheIfPulled = ({ list, cache }: { list: string[]; cache: boolean }) =>
  cache ? list : setLocalStorageItem(KEY_PROJECT_URIS, JSON.stringify(list)).then(() => list);

const showErrorStopLoading = (setIsLoading: (value: boolean) => void) => (e: Error) => {
  showToast(ToastStyle.Failure, e.message);
  setIsLoading(false);
};
