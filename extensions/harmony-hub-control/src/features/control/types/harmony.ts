export interface HarmonyHub {
  id: string;
  ip: string;
  name: string;
  remoteId: string;
  hubId: string;
  version: string;
  port?: string;
}

export interface HarmonyDevice {
  id: string;
  label: string;
  type: string;
  commands: HarmonyCommand[];
}

export interface HarmonyCommand {
  id: string;
  name: string;
  label: string;
  deviceId: string;
}

export interface ControlGroup {
  name: string;
  function: {
    name: string;
    action: string;
  }[];
}

export interface FixItItem {
  id: string;
  description: string;
  solution: string;
  urls?: string[];
}

export interface ActivityRule {
  type: string;
  condition: string;
  action: string;
}

export interface ActivitySequence {
  id: string;
  name: string;
  steps: {
    action: string;
    delay: number;
  }[];
}

export interface HarmonyActivity {
  id: string;
  label: string;
  isAVActivity: boolean;
  activityTypeDisplayName: string;
  controlGroup: ControlGroup[];
  fixit: FixItItem[];
  rules: ActivityRule[];
  sequences: ActivitySequence[];
  suggestedDisplay: string;
  type: string;
  status: string;
}
