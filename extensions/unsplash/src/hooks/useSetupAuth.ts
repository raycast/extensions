import { useCallback, useEffect, useState } from "react";
import { client, doAuth } from "@/oauth";

type AuthStatus = "loading" | "needs-setup" | "ready";

export function useSetupAuth() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [connectError, setConnectError] = useState("");

  useEffect(() => {
    client
      .getTokens()
      .then((tokens) => {
        setStatus(tokens?.accessToken ? "ready" : "needs-setup");
      })
      .catch(() => setStatus("needs-setup"));
  }, []);

  const connect = useCallback(async () => {
    setConnectError("");
    try {
      await doAuth();
      setStatus("ready");
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : "";
      if (!msg.includes("cancel") && !msg.includes("abort")) {
        setConnectError("Authentication failed. Please verify your setup and try again.");
      }
    }
  }, []);

  return { status, connectError, connect };
}
