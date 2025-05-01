import {
  getPreferenceValues,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from '@raycast/api';
import { APPS_KEY, Stages } from '@utils/constants';
import { expandHome } from '@utils/helpers';
import { existsSync } from 'fs';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

interface GarudaLaunchContextActions {
  setStage: (stage: Stages) => void;
  setSelectedApps: (apps: string[]) => void;
}

interface GarudaLaunchContextStates {
  base: string;
  stage: Stages;
  selectedApps: string[];
  loading: boolean;
}

type GarudaLaunchContextType = GarudaLaunchContextActions & GarudaLaunchContextStates;

const GarudaLaunchContext = createContext<GarudaLaunchContextType | undefined>(undefined);

export const useGarudaLaunchContext = (): GarudaLaunchContextType => {
  const context = useContext(GarudaLaunchContext);
  if (!context) throw new Error('useGarudaLaunch must be used within GarudaLaunchProvider');
  return context;
};

export const GarudaLaunchProvider = (props: PropsWithChildren) => {
  const { projectsPath } = getPreferenceValues<Preferences>();
  const base = expandHome(projectsPath);

  const [stage, setStage] = useState<Stages>('AppsSetup');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Validate projects path
  useEffect(() => {
    if (!existsSync(base)) {
      showToast({ style: Toast.Style.Failure, title: 'Please configure your projects directory' });
      openExtensionPreferences();
    }
  }, [base]);

  // Load apps from storage
  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(APPS_KEY);
      let apps: string[] = [];
      try {
        apps = stored ? JSON.parse(stored) : [];
      } catch (error: unknown) {
        if (error instanceof Error) {
          showToast({ style: Toast.Style.Failure, title: error.message });
        } else {
          showToast({ style: Toast.Style.Failure, title: 'An unknown error occurred' });
        }
      }
      const limited = apps.slice(0, 10);
      setSelectedApps(limited);
      setStage(limited.length > 0 ? 'ProjectsSelection' : 'AppsSetup');
      setLoading(false);
    })();
  }, []);

  return (
    <GarudaLaunchContext.Provider
      value={{ base, stage, selectedApps, loading, setStage, setSelectedApps }}
    >
      {props.children}
    </GarudaLaunchContext.Provider>
  );
};
