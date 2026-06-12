import { JSX, useEffect, useState } from "react";
import { List } from "@raycast/api";
import { loadClientId } from "../client-id";
import { SetupGuide } from "./SetupGuide";

export function RequireClientId({ children }: { children: JSX.Element }): JSX.Element {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    loadClientId().then((id) => setReady(Boolean(id)));
  }, []);

  if (ready === null) {
    return <List isLoading />;
  }

  if (!ready) {
    return <SetupGuide onComplete={() => setReady(true)} />;
  }

  return children;
}
