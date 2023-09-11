import { useEffect, useMemo, useState } from "react";
import { ISSHConnection } from "../types";
import useSSHConfigHosts from "./useSSHConfigHosts";
import { getConnections, saveConnections } from "../storage.api";

export default function useSSHConnections(withConfigHosts: boolean) {
  const [localList, setLocalList] = useState<ISSHConnection[]>([]);
  const { hosts, isLoading: isConfigLoading } = useSSHConfigHosts(!withConfigHosts);
  const [isLocalLoading, setIsLocalLoading] = useState<boolean>(true);

  async function removeItem(item: ISSHConnection) {
    let items: ISSHConnection[] = await getConnections();
    items = items.filter((i) => i.id !== item.id);

    await saveConnections(items);
    setLocalList(items);
  }

  useEffect(() => {
    (async () => {
      setIsLocalLoading(true);
      const items: ISSHConnection[] = await getConnections();
      setLocalList(items);
      setIsLocalLoading(false);
    })();
  }, []);

  const connectionsList = useMemo(() => {
    return [...localList, ...hosts];
  }, [localList, hosts]);

  return {
    connectionsList,
    loading: isLocalLoading || isConfigLoading,
    removeItem,
  };
}
