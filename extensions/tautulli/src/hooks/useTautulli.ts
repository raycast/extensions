import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { StreamResponse, ServerInfoResponse } from "../types";
import { tautulliApi } from "../utils";

export default function useTautulli() {
  const { isLoading, data, revalidate } = useFetch<StreamResponse>(tautulliApi("get_activity"));
  const { data: serverInfo } = useFetch<ServerInfoResponse>(tautulliApi("get_server_info"));
  const serverId = serverInfo?.response.data.pms_identifier;

  useEffect(() => {
    const refetchInterval = setInterval(() => {
      revalidate();
    }, 3000);

    return () => {
      clearInterval(refetchInterval);
    };
  }, [revalidate]);

  const sessions = data?.response.data?.sessions ?? [];

  return {
    isLoading,
    serverId,
    sessions,
  };
}
