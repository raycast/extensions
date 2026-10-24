export function shouldRefreshProcesses(launchType: string | undefined): boolean {
  return launchType !== "background";
}
