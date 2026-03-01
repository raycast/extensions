import { useEffect, useState } from "react";
import { getLocalExtensions, Extension } from "../lib/qoder";

export function useLocalExtensions(): {
  extensions: Extension[] | undefined;
  refresh: () => void;
} {
  const [extensions, setExtensions] = useState<Extension[] | undefined>(undefined);
  const [refreshFlag, setRefreshFlag] = useState(0);

  useEffect(() => {
    loadExtensions();
  }, [refreshFlag]);

  async function loadExtensions() {
    const exts = await getLocalExtensions();
    setExtensions(exts);
  }

  function refresh() {
    setRefreshFlag((prev) => prev + 1);
  }

  return { extensions, refresh };
}
