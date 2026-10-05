import { useEffect, useState } from "react";

import { resolveCredentials } from "../lib/session";
import { GetNoteCredentials } from "../lib/types";

export function useGetNoteCredentials() {
  const [credentials, setCredentials] = useState<GetNoteCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    setIsLoading(true);

    try {
      setCredentials(await resolveCredentials());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return {
    credentials,
    isLoading,
    reload,
  };
}
