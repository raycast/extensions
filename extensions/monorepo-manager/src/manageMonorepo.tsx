import { useState, useEffect } from 'react';
import { getConfigs } from './utils/config';
import { OpenExtensionPreferences } from './views/OpenExtensionPreferences';
import { WorkspaceRootList } from './views/WorkspaceRootList';
import { getDirectSubfolders } from './utils/fs';
import { SimplifiedWorkspace } from './types';

export default function MonorepoCommand() {
  const [rootSourceFolder, setRootSourceFolder] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<SimplifiedWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigLoaded, setIsConfigLoaded] = useState<boolean>(false);

  // start to read extension preferences
  useEffect(() => {
    if (!rootSourceFolder) {
      const configs = getConfigs();
      setRootSourceFolder(configs.rootSourceFolder);
      setIsConfigLoaded(true);
    }
  }, []);

  // start to read workspaces
  useEffect(() => {
    if (rootSourceFolder && workspaces.length === 0) {
      const workspaces = getDirectSubfolders(rootSourceFolder);
      setWorkspaces(workspaces);
      setIsLoading(false);
    }

    // before unmounting, we call data again to get latest data for next time
    return () => {
      if (rootSourceFolder) {
        getDirectSubfolders(rootSourceFolder, { ignoreCache: true });
      }
    };
  }, [rootSourceFolder]);

  if (isConfigLoaded && (!rootSourceFolder || !rootSourceFolder.length)) {
    return <OpenExtensionPreferences />;
  }

  return <WorkspaceRootList workspaces={workspaces} isLoading={isLoading} />;
}
