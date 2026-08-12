import { useEffect, useState } from "react";
import { getApiToken } from "../lib/preferences";

const POLL_INTERVAL_MS = 1000;

export function useApiToken(): string {
  const [token, setToken] = useState(getApiToken());

  useEffect(() => {
    const interval = setInterval(() => {
      const latest = getApiToken();
      setToken((current) => (current === latest ? current : latest));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return token;
}
