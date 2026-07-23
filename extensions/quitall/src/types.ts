export type AppRule = "default" | "whitelist" | "force";

export interface AppRulesState {
  version: 1;
  rules: Record<string, Exclude<AppRule, "default">>;
}

export interface RunningApplication {
  bundleId: string;
  executablePath?: string;
  name: string;
  path?: string;
  pid: number;
}

export interface ApplicationIdentity {
  bundleId: string;
  pid: number;
}

export interface QuitPlan {
  forceAfterTimeout: RunningApplication[];
  protected: RunningApplication[];
  requestNormalQuit: RunningApplication[];
  whitelisted: RunningApplication[];
}

export interface CustomProcessRule {
  forceAfterTimeout: boolean;
  name: string;
  path: string;
}

export interface RunningProcess {
  executablePath: string;
  name: string;
  pid: number;
}

export interface CustomApplicationMatch {
  application: RunningApplication;
  forceAfterTimeout: boolean;
}

export interface CustomProcessMatch {
  forceAfterTimeout: boolean;
  process: RunningProcess;
}

export interface CustomRuleMatches {
  applications: CustomApplicationMatch[];
  processes: CustomProcessMatch[];
}
