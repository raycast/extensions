const DEFAULT_TIMEOUT = 8_000;
const ITEM_LIST_TIMEOUT = 30_000;

export function getCommandTimeout(args: string[]) {
  return args[0] === "item" && args[1] === "list" ? ITEM_LIST_TIMEOUT : DEFAULT_TIMEOUT;
}

export function isTimeoutError(error: { killed?: boolean; signal?: string | null }) {
  return error.killed === true && error.signal === "SIGTERM";
}

export function isVaultCreatedDespiteResponseError(message: string) {
  return (
    /error creating vault/i.test(message) &&
    /error parsing response body/i.test(message) &&
    /invalid type: null, expected struct OrganizationPasswordPolicy/i.test(message)
  );
}

export function findCreatedVault<T extends { name: string; shareId: string }>(before: T[], after: T[], name: string) {
  const previousShareIds = new Set(before.map((vault) => vault.shareId));
  return after.find((vault) => vault.name === name && !previousShareIds.has(vault.shareId));
}
