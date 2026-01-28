export function versionCompare(v1: string, v2: string) {
  if (v1 === v2) {
    return 0;
  }

  const v1parts = v1.split(".");
  const v2parts = v2.split(".");

  if (v1parts[0] > v2parts[0]) {
    return 1;
  }

  if (v1parts[0] < v2parts[0]) {
    return -1;
  }

  return v1parts[1] > v2parts[1] ? 1 : -1;
}
