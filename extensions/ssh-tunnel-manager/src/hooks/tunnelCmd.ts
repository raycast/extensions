import { useExec } from "@raycast/utils";
import { useState, useEffect, SetStateAction, Dispatch, MutableRefObject } from "react";
import { Values, Storage, ListData, TunnelType } from "../types";
import { cache } from "./store";

export const useTunelCmd = (
  listData: ListData[],
  setListData: Dispatch<SetStateAction<ListData[]>>,
  alivePidSet: Set<string>,
  defaultTunnelParams: Partial<Values>,
  shouldEstablish: MutableRefObject<boolean>
) => {
  const [tunnelParams, setTunnelParams] = useState<Partial<Values>>({ ...defaultTunnelParams });

  const { name, sshHost, user, remoteHost, localPort, remotePort, sshPort, type, identityFile } = tunnelParams;

  const {
    isLoading,
    data: pid,
    revalidate: establish,
    mutate: mutatePid,
  } = useExec(
    "nohup",
    [
      "ssh",
      "-N",
      "-oServerAliveInterval=60",
      identityFile && identityFile[0] ? `-i ${identityFile[0]}` : "",
      "-p",
      `${sshPort?.trim() || 22}`,
      `${user?.trim()}@${sshHost?.trim()}`,
      `-${type === TunnelType.Local ? "L" : "R"}`,
      `${localPort?.trim()}:${remoteHost?.trim() || "localhost"}:${remotePort?.trim()}`,
      ">",
      `/tmp/${name?.trim()}.log`,
      "2>&1",
      "&",
      "echo",
      "$!",
    ],
    {
      shell: true,
      execute: false,
      initialData: null,
    }
  );

  useEffect(() => {
    if (pid) {
      alivePidSet.add(pid.trim());
      cache.set(Storage.AlivePidList, JSON.stringify(Array.from(alivePidSet)));
    }
    const listItem = listData.find((i) => i.name === name);
    if (pid && !listItem && tunnelParams.name) {
      listData.push({ ...(tunnelParams as Values), pid: pid.trim() });
    } else if (pid && listItem) {
      listItem.pid = pid.trim();
    }
    setListData([...listData]);
  }, [pid]);

  useEffect(() => {
    cache.set(Storage.List, JSON.stringify(listData.filter((i) => i.name)));
    mutatePid(undefined, {
      optimisticUpdate: (data) => null,
      shouldRevalidateAfter: false,
    });
  }, [listData]);

  useEffect(() => {
    if (shouldEstablish.current) establish();
    else shouldEstablish.current = true;
  }, [tunnelParams, defaultTunnelParams]);

  return {
    isLoading,
    tunnelParams,
    setTunnelParams,
    pid,
    establish,
    mutatePid,
    name,
  };
};

export const useKillTunnelCmd = () => {
  const [pidToKill, setPidToKill] = useState<string | null>(null);

  const { revalidate: killTunnel } = useExec("kill", ["-9", `${pidToKill}`], {
    execute: false,
  });

  useEffect(() => {
    if (pidToKill) killTunnel();
  }, [pidToKill]);

  return {
    killTunnel,
    setPidToKill,
  };
};
