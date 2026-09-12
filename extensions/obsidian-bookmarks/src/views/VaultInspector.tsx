import { Detail, Toast } from "@raycast/api";
import React, { useEffect, useRef, useState } from "react";
import { showErrorToast } from "../helpers/toastable-error";
import { getOrCreateBookmarksPath } from "../helpers/vault-path";

type Props = { children: React.ReactNode };
export default function VaultInspector({ children }: Props): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const toastRef = useRef<Toast>();

  useEffect(() => {
    const fetch = async () => {
      try {
        await getOrCreateBookmarksPath();
      } catch (err) {
        toastRef.current = await showErrorToast(err);
        setHasError(true);
      }
      setLoading(false);
    };

    fetch();
    return () => {
      toastRef.current?.hide();
    };
  }, [toastRef, setHasError, setLoading]);

  if (loading || hasError) {
    // We basically just need a "blank" view if we don't have enough
    // configuration to even load the Obsidian vault.
    return <Detail isLoading={loading} />;
  } else {
    return <>{children}</>;
  }
}
