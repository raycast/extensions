const APPS_KEY = 'garuda_selectedApps';

const STAGE = {
  AppsSetup: 'AppsSetup',
  ProjectsSelection: 'ProjectsSelection',
} as const;

type Stages = keyof typeof STAGE;

export { APPS_KEY, STAGE, type Stages };
