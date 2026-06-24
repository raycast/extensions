export type SubmissionGate = {
  enter(): boolean;
  leave(): void;
};

export const createSubmissionGate = (): SubmissionGate => {
  let active = false;
  return {
    enter() {
      if (active) return false;
      active = true;
      return true;
    },
    leave() {
      active = false;
    },
  };
};

export const runConfirmedAction = async (confirmed: boolean, action: () => Promise<unknown>) => {
  if (!confirmed) return false;
  await action();
  return true;
};

export const resolveMoveTargetNodeId = (selectedNodeId: string, manualNodeId: string) =>
  manualNodeId.trim() || selectedNodeId.trim();
