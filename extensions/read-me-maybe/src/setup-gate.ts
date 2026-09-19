import { LocalStorage } from "@raycast/api";

import {
  accessCheckStatusKinds,
  migrateAccessState,
  type AccessCheckState,
  type AccessCheckStatus,
  type AccessCheckStatusKind,
} from "./domain/access-check-state";

export const setupGateStorageKey = "setup-gate";
const accessCheckStatusStorageKey = "access-check-status";

type StoredAccessCheckStatus = {
  kind: AccessCheckStatusKind;
  checkedAt: string;
};

export async function loadAccessCheckState(): Promise<AccessCheckState> {
  const [setupGate, storedStatus] = await Promise.all([
    LocalStorage.getItem<boolean>(setupGateStorageKey),
    LocalStorage.getItem<string>(accessCheckStatusStorageKey),
  ]);

  return {
    setupGate: setupGate === true,
    accessCheckStatus: deserializeAccessCheckStatus(storedStatus),
  };
}

export async function migrateLegacySetupGate(): Promise<AccessCheckState> {
  const migration = migrateAccessState(await loadAccessCheckState());
  if (migration.clearLegacyGate) await saveAccessCheckState(migration.state);
  return migration.state;
}

export async function saveAccessCheckState(state: AccessCheckState): Promise<void> {
  if (state.setupGate) {
    await LocalStorage.setItem(setupGateStorageKey, true);
  } else {
    await LocalStorage.removeItem(setupGateStorageKey);
  }

  if (state.accessCheckStatus) {
    await LocalStorage.setItem(
      accessCheckStatusStorageKey,
      JSON.stringify({
        kind: state.accessCheckStatus.kind,
        checkedAt: state.accessCheckStatus.checkedAt.toISOString(),
      }),
    );
  } else {
    await LocalStorage.removeItem(accessCheckStatusStorageKey);
  }
}

function deserializeAccessCheckStatus(value: string | undefined): AccessCheckStatus | undefined {
  const parsed = parseStoredAccessCheckStatus(value);
  if (!parsed) return undefined;
  const checkedAt = new Date(parsed.checkedAt);
  if (Number.isNaN(checkedAt.getTime())) return undefined;
  return { kind: parsed.kind, checkedAt };
}

function parseStoredAccessCheckStatus(value: string | undefined): StoredAccessCheckStatus | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "kind" in parsed &&
      typeof parsed.kind === "string" &&
      isAccessCheckStatusKind(parsed.kind) &&
      "checkedAt" in parsed &&
      typeof parsed.checkedAt === "string"
    ) {
      return { kind: parsed.kind, checkedAt: parsed.checkedAt };
    }
  } catch {
    // Invalid retained data is treated as an absent Access Check Status.
  }
  return undefined;
}

function isAccessCheckStatusKind(value: string): value is AccessCheckStatusKind {
  return (accessCheckStatusKinds as readonly string[]).includes(value);
}
