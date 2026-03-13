import { LocalStorage } from "@raycast/api";
import { Address, createSolanaRpc } from "@solana/kit";
import { useEffect, useMemo, useState } from "react";

const mainnetRPC = createSolanaRpc("https://api.mainnet-beta.solana.com");
const devnetRPC = createSolanaRpc("https://api.devnet.solana.com");
const clusterKey = "cluster";

export function useSolana() {
  const [cluster, setCluster] = useState<"mainnet" | "devnet">("mainnet");
  const rpc = useMemo(() => {
    return cluster === "devnet" ? devnetRPC : mainnetRPC;
  }, [cluster]);

  const solScanCluster = useMemo(() => {
    return cluster === "devnet" ? "?cluster=devnet" : "";
  }, [cluster]);

  function getSolScanURL(param: string) {
    const path = `${param.length < 50 ? "account" : "tx"}/${param}`;
    return `https://solscan.io/${path}${solScanCluster}`;
  }

  async function getSOLBalance(address: Address) {
    const res = await rpc.getBalance(address).send();
    return res.value;
  }

  async function loadCluster() {
    const cluster = await LocalStorage.getItem<"mainnet" | "devnet">(clusterKey);
    setCluster(cluster || "mainnet");
  }

  async function saveCluster() {
    return LocalStorage.setItem(clusterKey, cluster);
  }

  useEffect(() => {
    loadCluster();
  }, []);

  useEffect(() => {
    saveCluster();
  }, [cluster]);

  return { getSolScanURL, cluster, rpc, getSOLBalance, setCluster };
}
