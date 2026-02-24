import { useCachedPromise } from "@raycast/utils";
import { fetchMounts } from "../lib/api";

export default function useRemoteMountPoints(remote: string) {
  return useCachedPromise(
    async (remoteName: string) => {
      const response = await fetchMounts();
      const mountPoints = response?.mountPoints ?? [];

      return mountPoints.filter((mountPoint) => matchesRemote(mountPoint.Fs, remoteName));
    },
    [remote],
    {
      keepPreviousData: true,
    },
  );
}

function matchesRemote(fsValue: string, remoteName: string) {
  if (!fsValue) {
    return false;
  }

  if (fsValue === remoteName) {
    return true;
  }

  return fsValue.startsWith(`${remoteName}:`);
}
