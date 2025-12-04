export type CLIOutput = {
  activeAppID: string;
  activeAppName: string;
  activeWorkflows: WorkflowItem[];
  globalWorkflows: WorkflowItem[];
};

export type PreparedCLIOutput = {
  appName: string;
  workflows: WorkflowItem[];
};

export type WorkflowItem = {
  fullTitle: string;
  workflowID: string;
  isGlobal: boolean;
};
