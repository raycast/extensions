import { getPreferenceValues, LocalStorage, Form, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import Authenticate, { Session } from "./auth";

// const createMaskedEmail = async (description: string, accessToken: AccessToken): Promise<CreateMaskedEmailResponse> => {
//   fetch("https://api.fastmail.com/jmap/api/", {
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer: ${accessToken}`,
//     },
//   });
// };

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

  console.log("loading", isLoading);
  console.log("session", session);

  if (isLoading) {
    return <Form isLoading={isLoading} />;
  }

  if (!session) {
    return <Authenticate username={username} password={password} didAuthenticate={saveSession} />;
  }

  return (
    <Form
      navigationTitle="New masked email"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: unknown) => {
              console.log(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Remind yourself what this email is for" />
      <Form.TextField id="label" title="Description" />
    </Form>
  );
}
