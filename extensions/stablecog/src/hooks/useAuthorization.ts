import { authorize } from "@api/oauth";
import { useEffect, useState } from "react";

export function useToken() {
  const [isTokenLoading, setTokenLoading] = useState(true);
  const [token, setToken] = useState<string | undefined>(undefined);
  useEffect(() => {
    (async () => {
      try {
        const res = await authorize();
        setToken(res);
      } catch (error) {
        console.log(error);
      } finally {
        setTokenLoading(false);
      }
    })();
  });
  return { token, isTokenLoading };
}
