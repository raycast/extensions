function formatBytes(bytes: number): string {
  const decimals = 2;
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm: number = decimals < 0 ? 0 : decimals;
  const sizes: string[] = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i: number = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function isObjectEmpty(obj: object): boolean {
  for (const property in obj) {
    return false;
  }
  return true;
}

export { formatBytes, isObjectEmpty };
