import { LocalStorage } from "@raycast/api";

const clientInstanceIdStorageKey = "arhiva:raycast-client-instance-id";
const clientInstanceIdMaxLength = 128;

function isValidClientInstanceId(value: string) {
  return value.length > 0 && value.length <= clientInstanceIdMaxLength;
}

export async function getRaycastClientInstanceId() {
  const stored = await LocalStorage.getItem<string>(clientInstanceIdStorageKey);
  if (stored != null && isValidClientInstanceId(stored)) {
    return stored;
  }

  const next = crypto.randomUUID();
  await LocalStorage.setItem(clientInstanceIdStorageKey, next);
  return next;
}
