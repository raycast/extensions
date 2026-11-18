import { useEffect, useState } from "react";
import { showFailureToast, useCachedState } from "@raycast/utils";

import { Instance } from "../types";
import { getAuthHeader } from "../utils/auth";

export function useAuthHeader(instance: Instance | undefined) {
  const [header, setHeader] = useState<string | undefined>();
  const [selectedInstance, setSelectedInstance] = useCachedState<Instance>("instance");

  const tokenKey =
    instance?.authMode === "oauth"
      ? `${instance.id}:${instance.tokenExpiresAt ?? ""}:${instance.accessToken ?? ""}`
      : "";

  useEffect(() => {
    if (!instance) {
      setHeader(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const value = await getAuthHeader(instance, {
          onRefresh: (updated) => {
            if (selectedInstance?.id === updated.id) {
              setSelectedInstance(updated);
            }
          },
        });
        if (!cancelled) setHeader(value);
      } catch (error) {
        if (!cancelled) setHeader(undefined);
        await showFailureToast(error, { title: "Authentication failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instance?.id, instance?.username, instance?.password, instance?.authMode, tokenKey]);

  return header;
}
