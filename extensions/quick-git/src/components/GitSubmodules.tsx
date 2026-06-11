import { useCachedPromise } from "@raycast/utils";
import { parseSubmoduleKey, submodulesConfig } from "../utils/submodules.js";
import { ReactElement, useMemo } from "react";
import { List } from "@raycast/api";
import { GitSubmoduleItem } from "./GitSubmodules/GitSubmoduleItem.js";
import { GitSubmodulesEmpty } from "./GitSubmodules/GitSubmodulesEmpty.js";
import { Providers } from "./Providers.js";
import { navigationTitle } from "../utils/navigationTitle.js";
import { useSelectedRepoStorage } from "../hooks/useRepo.js";

interface Props {
  changeRepo: (repoDir: string) => Promise<void>;
  checkStatus: () => void;
}

export function GitSubmodules({ changeRepo, checkStatus }: Props) {
  const repo = useSelectedRepoStorage();
  const submodules = useCachedPromise(submodulesConfig, [repo.value], { execute: !!repo.value });

  const submoduleList = useMemo(() => {
    if (!submodules.data) {
      return <GitSubmodulesEmpty />;
    }

    return (
      <>
        {Object.entries(submodules.data).reduce<ReactElement[]>((list, [key, value]) => {
          const keyName = parseSubmoduleKey(key);
          if (!keyName) {
            return list;
          }

          list.push(
            <GitSubmoduleItem key={key} dir={keyName} path={value.path} url={value.url} updateRepo={changeRepo} />,
          );
          return list;
        }, [])}
      </>
    );
  }, [changeRepo, submodules.data]);

  return (
    <Providers repo={{ ...repo, setValue: changeRepo }} checkStatus={checkStatus}>
      <List
        navigationTitle={navigationTitle("Submodules", repo.value)}
        isLoading={repo.isLoading || submodules.isLoading}
      >
        {submoduleList}
      </List>
    </Providers>
  );
}
