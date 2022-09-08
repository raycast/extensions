import { getApplications } from "@raycast/api";
import { Response } from "./types";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

export function useCastSearch(query: string) {
  const { data, isLoading } = useFetch<Response>(
    "https://searchcaster.xyz/api/search?" + new URLSearchParams({ text: query, count: "100" })
  );

  return { data, isLoading };
}

async function isFarcasterInstalled(): Promise<boolean> {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "org.erb.FarcasterClient");
}

export function useFarcasterInstalled() {
  const [installed, setInstalled] = useState<boolean>(false);
  useEffect(() => {
    async function checkForFarcaster() {
      const spotifyIsInstalled = await isFarcasterInstalled();
      setInstalled(spotifyIsInstalled);
    }
    checkForFarcaster();
  }),
    [installed];
  return installed;
}
