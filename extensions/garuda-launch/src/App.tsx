import { AppsSetup } from '@components/AppsSetup';
import { ProjectsSelection } from '@components/ProjectsSelection';
import { useGarudaLaunchContext } from '@hooks/useGarudaLaunchContext';
import { resolve } from 'path';
import React from 'react';

export const App: React.FC = () => {
  const { stage, base, selectedApps } = useGarudaLaunchContext();

  if (stage === 'AppsSetup') {
    return <AppsSetup />;
  }

  const appEntries = selectedApps.map((app, i) => ({
    path: app,
    name: resolve(app).split('/').pop() ?? 'Unknown App'.replace(/\.app$/, ''),
    hotkey: (i + 1).toString(),
  }));

  return <ProjectsSelection base={base} appEntries={appEntries} />;
};
