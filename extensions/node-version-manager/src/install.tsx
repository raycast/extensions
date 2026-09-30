import { useState, useEffect } from 'react';
import { useCachedState } from '@raycast/utils';
import versionManager from './utils/versionManager';
import ListView from './components/lists/list';
import EmptyView from './components/lists/EmptyView';

import { NodeVersionGrouped } from './types';

export default function Command() {
  const [versionsGrouped, setVersionsGrouped] = useCachedState<NodeVersionGrouped>('nonInstalledVersionsGrouped', {});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [updateList, setUpdateList] = useState<boolean>(true);
  const isVersionManagerInstalled = versionManager.isInstalled;
  const versionManagerName = versionManager.name.toUpperCase();

  useEffect(() => {
    if (isVersionManagerInstalled && updateList) {
      setIsLoading(true);
      const remoteVersions = versionManager.listRemote();
      const installedVersions = versionManager.list();

      const remoteVersionsGrouped = remoteVersions.reduce((acc, item) => {
        if (installedVersions.find((installedVersion) => installedVersion.title === item.title)) {
          return acc;
        }

        const group = item.group;
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(item);
        return acc;
      }, {} as NodeVersionGrouped);

      setVersionsGrouped(remoteVersionsGrouped);
      setIsLoading(false);
      setUpdateList(false);
    }
  }, [updateList]);

  const onUpdateList = () => {
    setUpdateList(true);
  };

  if (!isVersionManagerInstalled) {
    return <EmptyView versionManagerName={versionManagerName} />;
  }

  return (
    <ListView
      versions={versionsGrouped}
      isLoading={isLoading}
      versionManagerName={versionManagerName}
      onUpdateList={onUpdateList}
      isInstallView={true}
    />
  );
}
