import type { Device, Govee } from "@j3lte/govee-lan-controller";

import type { Icon } from "@raycast/api";

export type ScenarioInput = {
  onOff: boolean | null;
  brightness: number | null;
  color: { r: number; g: number; b: number } | null;
};

export type DeviceScenario = {
  id: string;
  scenario: ScenarioInput | null;
};

export type ScenarioData = {
  title: string;
  icon?: keyof typeof Icon;
  all: ScenarioInput | null;
  devices: Array<DeviceScenario>;
};

export type Scenario = ScenarioData & { id: string };

export type GoveeNameMapping = Record<string, string>;

export type ScenariosHook = {
  scenarios: Scenario[];
  getScenario: (id: string) => Scenario | undefined;
  createScenario: (data: ScenarioData) => string;
  updateScenario: (id: string, data: ScenarioData) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => string;
  isLoading: boolean;
};

export type GoveeControllerReturn = {
  devices: Device[];
  executeScenario: ({ scenario }: { scenario: Scenario }) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  controller: Govee | null;
};
