import { useFetch } from "@raycast/utils";
import { ipfsLinkToHttpLink } from "../utils/ipfs";

export function useIpfsContent(ipfsLink?: string) {
  const { isLoading, data } = useFetch<string>(ipfsLink ? ipfsLinkToHttpLink(ipfsLink) : "", {
    execute: Boolean(ipfsLink),
    parseResponse(response) {
      return response.text();
    },
  });

  return {
    isLoading,
    data,
  };
}
