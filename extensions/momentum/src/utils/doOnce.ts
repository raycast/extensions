import { LocalStorage } from "@raycast/api";

export const doOnce = async (operationId: string, func: () => void) => {
  const hasRun = await LocalStorage.getItem(operationId);

  if (!hasRun) {
    func();
    await LocalStorage.setItem(operationId, true);
  }
};
