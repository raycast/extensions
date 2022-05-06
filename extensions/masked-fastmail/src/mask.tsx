import { getPreferenceValues, LocalStorage, Form } from "@raycast/api";
import { useEffect, useState } from "react";
import Authenticate, { Session } from "./auth";
import MaskedEmailForm from "./masked_email_form";

export default function Command() {
  const [isLoading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | undefined>();

  const saveSession = (session: Session) => {
    LocalStorage.setItem("session", JSON.stringify(session));
    setSession(session);
  };

  const { username, password } = getPreferenceValues();

  useEffect(() => {
    if (session) {
      return;
    }

    (async () => {
      const rawSession = await LocalStorage.getItem("session");

      if (typeof rawSession === "string") {
        const session = JSON.parse(rawSession);
        setSession(session);
      }

      setLoading(false);
    })();
  }, [session]);

  if (isLoading) {
    return <Form isLoading={isLoading} />;
  }

  if (!session) {
    return <Authenticate username={username} password={password} didAuthenticate={saveSession} />;
  }

  return <MaskedEmailForm session={session} />;
}
