import { useState, useEffect } from 'react';
import { useCachedState } from '@raycast/utils';
import versionManager from './utils/versionManager';
import ListView from './components/lists/list';
import EmptyView from './components/lists/EmptyView';

import { NodeVersionGrouped } from './types';

export default function Command() {
  const [versionsGrouped, setVersionsGrouped] = useCachedState<NodeVersionGrouped>('remoteVersionsGrouped', {});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isVersionManagerInstalled = versionManager.isInstalled;
  const versionManagerName = versionManager.name.toUpperCase();

  useEffect(() => {
    if (isVersionManagerInstalled) {
      setIsLoading(true);
      const installedVersions = versionManager.listRemote();

      const installedVersionsGrouped = installedVersions.reduce((acc, item) => {
        const group = item.group;
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(item);
        return acc;
      }, {} as NodeVersionGrouped);

      setVersionsGrouped(installedVersionsGrouped);
      setIsLoading(false);
    }
  }, []);

  if (!isVersionManagerInstalled) {
    return <EmptyView versionManagerName={versionManagerName} />;
  }

  return (
    <ListView
      versions={versionsGrouped}
      isLoading={isLoading}
      versionManagerName={versionManagerName}
      isInstallView={true}
    />
  );
}
