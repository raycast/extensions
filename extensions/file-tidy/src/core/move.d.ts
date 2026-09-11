export function moveFile(
  from: string,
  to: string,
  rename?: (from: string, to: string) => void,
  unlinkSource?: (path: string) => void,
): void;
