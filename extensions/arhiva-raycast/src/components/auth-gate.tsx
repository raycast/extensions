import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";

import { subscribeToAuthRequired } from "../lib/auth-state";
import { getStoredSession } from "../lib/storage";
import { SignInForm } from "./sign-in-form";

type AuthGateProps = Readonly<{
  children: React.ReactNode;
}>;

export function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<"loading" | "signed-out" | "signed-in">("loading");

  useEffect(() => {
    let isMounted = true;
    void getStoredSession().then((session) => {
      if (isMounted) {
        setState(session === null ? "signed-out" : "signed-in");
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthRequired(() => {
      setState("signed-out");
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return <Detail isLoading markdown="" />;
  }

  if (state === "signed-out") {
    return <SignInForm onSignedIn={() => setState("signed-in")} />;
  }

  return <>{children}</>;
}
