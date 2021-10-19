import { useEffect, useState } from "react";
import { SelectedWorkspace } from "../types/preferences";
<<<<<<< HEAD
import { EntriesEntity } from "../types/SketchProjectShares";
import { Share } from "../types/SketchWorkspaceShare";
import { getProjectShares, getShares } from "../utils/functions";
=======
import { Share } from "../types/SketchWorkspaceShare";
import { getShares } from "../utils/functions";
>>>>>>> 03c01420ef3b43e9aa6fbbd48100f74091d333f5

export default function useSearch(
  token: string | undefined,
  selectedWorkspace: SelectedWorkspace | undefined,
<<<<<<< HEAD
  query: string | undefined,
  shortId?: string
): {
  data: Record<"shares", Share[] | EntriesEntity[]> | undefined;
  error?: string;
  isLoading: boolean;
} {
  const [data, setData] = useState<{ shares: Share[] | EntriesEntity[] }>({ shares: [] });
=======
  query: string | undefined
): {
  data: Record<"shares", Share[]> | undefined;
  error?: string;
  isLoading: boolean;
} {
  const [data, setData] = useState<{ shares: Share[] }>({ shares: [] });
>>>>>>> 03c01420ef3b43e9aa6fbbd48100f74091d333f5
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    setIsLoading(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (cancel || !token || !selectedWorkspace) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
<<<<<<< HEAD
        const shares = shortId
          ? await getProjectShares(token, shortId, query)
          : await getShares(token, selectedWorkspace, query);
=======
        const shares: Share[] | undefined = await getShares(token, selectedWorkspace, query);
>>>>>>> 03c01420ef3b43e9aa6fbbd48100f74091d333f5
        if (!cancel && shares) {
          setData({
            shares: shares,
          });
        } else if (shares === undefined) {
          setError('Launch "Set Workspace" first!');
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error) {
        if (!cancel) {
<<<<<<< HEAD
          setError((error as ErrorEvent).message);
=======
          setError(error as string);
>>>>>>> 03c01420ef3b43e9aa6fbbd48100f74091d333f5
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query, token, selectedWorkspace]);

  return { data, error, isLoading };
}
