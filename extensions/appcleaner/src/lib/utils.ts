import { showToast, Toast } from "@raycast/api";

export function showError(message: string, title = "Error") {
  showToast({ style: Toast.Style.Failure, title, message });
}

export async function sleep(delay = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

type SomeObject = {
  [key: string]: number | string | boolean | SomeObject | null | undefined;
};

function isObject(object: unknown) {
  return object != null && typeof object === "object";
}

export function deepEqual(object1: unknown, object2: unknown) {
  const keys1 = Object.keys(object1 as SomeObject);
  const keys2 = Object.keys(object2 as SomeObject);
  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    const val1 = (object1 as SomeObject)[key];
    const val2 = (object2 as SomeObject)[key];
    const areObjects = isObject(val1) && isObject(val2);
    if ((!areObjects && val1 !== val2) || (areObjects && !deepEqual(val1, val2))) return false;
  }
  return true;
}
