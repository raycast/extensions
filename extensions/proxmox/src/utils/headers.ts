import type { PveServer } from "@/types";

export function buildHeaders(server: PveServer) {
  return {
    Authorization: `PVEAPIToken=${server.tokenId}=${server.tokenSecret}`,
  };
}
