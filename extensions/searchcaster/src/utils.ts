import { getApplications } from "@raycast/api";
import { CastResponse, ProfileResponse } from "./types";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

export function useCastSearch(query: string) {
  const searchParams = new URLSearchParams({ text: query, count: "100" });

  // If the query contains from:${username} then we should filter casts by that username
  if (query.includes("from:")) {
    const username = query.split("from:")[1].trim();
    searchParams.append("username", username);
    searchParams.set("text", query.replace(`from:${username}`, "").trim());
  }

  const { data, isLoading } = useFetch<CastResponse>("https://searchcaster.xyz/api/search?" + searchParams);

  return { data, isLoading };
}

export function useProfileSearch(query: string) {
  const searchParams = new URLSearchParams({ q: query });
  const { data, isLoading } = useFetch<ProfileResponse>("https://searchcaster.xyz/api/profiles?" + searchParams);
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

export function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
