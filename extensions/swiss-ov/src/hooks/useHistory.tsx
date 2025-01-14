import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectionRequirement } from "../types";

type History = { timestamp: number; connection: ConnectionRequirement };

export function useHistory() {
  const [data, setData] = useState<History[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const storedHistory = await LocalStorage.getItem<string>("connection-history");
      if (storedHistory) {
        setData(JSON.parse(storedHistory));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      LocalStorage.setItem("connection-history", JSON.stringify(data));
    }
  }, [data, isLoading]);

  const addHistory = useCallback(
    async (history: History) => {
      //filter old item that is already in list
      const filtered = data.filter(
        (oldHistory) =>
          !(
            oldHistory.connection.from === history.connection.from && oldHistory.connection.to === history.connection.to
          ),
      );
      setData([...filtered, history].sort((a, b) => b.timestamp - a.timestamp));
    },
    [setData, data],
  );

  const removeHistory = useCallback(
    async (history: History) => {
      //filter old connection with the same from and to
      const filtered = data.filter(
        (oldHistory) =>
          !(
            oldHistory.connection.from === history.connection.from && oldHistory.connection.to === history.connection.to
          ),
      );
      setData([...filtered]);
    },
    [setData, data],
  );

  return useMemo(() => ({ data, addHistory, removeHistory, isLoading }), [data, addHistory, removeHistory, isLoading]);
}
