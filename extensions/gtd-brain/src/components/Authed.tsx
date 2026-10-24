import { Detail } from "@raycast/api";
import { useEffect, useState, type ReactNode } from "react";
import { appOpened } from "../lib/events";
import { clearSession, getSession, type Session } from "../lib/session";
import { Login } from "./Login";

// Every view command renders through this: the launch is counted (app_opened, session-guarded)
// whether or not someone is signed in, then the login form stands in until there is a session.
export function Authed({ children }: { children: (session: Session, signOut: () => Promise<void>) => ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    void appOpened();
    void getSession().then(setSession);
  }, []);

  const signOut = async () => {
    await clearSession();
    setSession(null);
  };

  if (session === undefined) return <Detail isLoading markdown="" />;
  if (!session) return <Login onSignedIn={setSession} />;
  return <>{children(session, signOut)}</>;
}
