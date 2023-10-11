export type Preferences = {
  makeApiKey: string;
  environmentUrl: string;
  organizationId: string;
  skipWebhooks?: boolean;
};

export type RunScenarioResponse = {
  executionId: string;
};
