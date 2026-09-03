import {
  MINIMUM_PHI_VERSION,
  PHI_SCRIPTING_API_V2_MINIMUM_VERSION,
  requirePhiVersion,
} from "./phi";
import { runWithPhiInvocation } from "./invocation-context";
import { PHI_SCRIPTING_API_V2 } from "./types";

export interface PhiVersionRequirement {
  minimumPhiVersion: string;
  minimumPhiAPIVersion?: number;
}

export const PHI_COMMAND_REQUIREMENTS = {
  "search-spaces": { minimumPhiVersion: MINIMUM_PHI_VERSION },
  "search-history": { minimumPhiVersion: MINIMUM_PHI_VERSION },
  "search-tabs": { minimumPhiVersion: MINIMUM_PHI_VERSION },
  "search-current-space-tabs": { minimumPhiVersion: MINIMUM_PHI_VERSION },
  "phi-actions": { minimumPhiVersion: MINIMUM_PHI_VERSION },
  "new-tab": { minimumPhiVersion: MINIMUM_PHI_VERSION },
  "new-window": { minimumPhiVersion: MINIMUM_PHI_VERSION },
  "new-incognito-window": { minimumPhiVersion: MINIMUM_PHI_VERSION },
  "new-kiosk-window": {
    minimumPhiVersion: PHI_SCRIPTING_API_V2_MINIMUM_VERSION,
    minimumPhiAPIVersion: PHI_SCRIPTING_API_V2,
  },
  "new-incognito-space": {
    minimumPhiVersion: PHI_SCRIPTING_API_V2_MINIMUM_VERSION,
    minimumPhiAPIVersion: PHI_SCRIPTING_API_V2,
  },
} as const satisfies Record<string, PhiVersionRequirement>;

export type PhiCommandName = keyof typeof PHI_COMMAND_REQUIREMENTS;

export async function runPhiVersionedOperation<Result>(
  requirement: PhiVersionRequirement,
  operation: () => Promise<Result> | Result,
): Promise<Result> {
  if (requirement.minimumPhiAPIVersion === undefined) {
    await requirePhiVersion(requirement.minimumPhiVersion);
  } else {
    await requirePhiVersion(
      requirement.minimumPhiVersion,
      requirement.minimumPhiAPIVersion,
    );
  }
  return operation();
}

export function runPhiCommand<Result>(
  command: PhiCommandName,
  operation: () => Promise<Result> | Result,
): Promise<Result> {
  return Promise.resolve(
    runWithPhiInvocation({ clientCommand: command }, () =>
      runPhiVersionedOperation(PHI_COMMAND_REQUIREMENTS[command], operation),
    ),
  );
}

export function runPhiAction<Result>(
  command: PhiCommandName,
  action: string,
  requirement: PhiVersionRequirement,
  operation: () => Promise<Result> | Result,
): Promise<Result> {
  return Promise.resolve(
    runWithPhiInvocation({ clientCommand: command, clientAction: action }, () =>
      runPhiVersionedOperation(requirement, operation),
    ),
  );
}

export function runPhiCommandAction<Result>(
  command: PhiCommandName,
  action: string,
  operation: () => Promise<Result> | Result,
): Promise<Result> {
  return runPhiAction(
    command,
    action,
    PHI_COMMAND_REQUIREMENTS[command],
    operation,
  );
}
