import { useEffect, useState } from "react";
import { useRefreshSignal } from "../stores/refresh-store";
import type { DirectorySnapshot } from "../types";
import { getDirectorySnapshot } from "../utils/storage";

export const useDirectoryData = (path: string) => {
  const [data, setData] = useState<DirectorySnapshot>({
    accessible: [],
    restricted: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const refreshVersion = useRefreshSignal();

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    getDirectorySnapshot(path).then((snapshot) => {
      if (active) {
        if (snapshot) {
          setData(snapshot);
        } else {
          setData({ accessible: [], restricted: [] });
        }
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [path, refreshVersion]);

  return { data, isLoading };
};
