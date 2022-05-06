import { Form, ActionPanel, Action, showToast, Toast, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import nodeFetch from "node-fetch";
import fetchCookie from "fetch-cookie";

const cookieJar = new fetchCookie.toughCookie.CookieJar();
const fetch = fetchCookie(nodeFetch, cookieJar);

export interface Session {
  accessToken: string;
  loginId: string;
  accountId: string;
}

interface AuthResponse {
  accessToken?: string;
  methods?: [{ type: string }];
  primaryAccounts?: { [key: string]: string };
}

const authenticateURL = "https://www.fastmail.com/jmap/authenticate/";

type AuthenticationResult = { type: "session"; value: Session } | { type: "totp"; loginId: string };
const authenticate = async (username: string, password: string): Promise<AuthenticationResult> => {
  const usernameResponse = await fetch(authenticateURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });

  const { loginId } = (await usernameResponse.json()) as { loginId?: string };

  if (!loginId) {
    throw new Error("Unable to get `loginId` from Fastmail");
  }

  const passwordResponse = await fetch(authenticateURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      loginId,
      type: "password",
      value: password,
      remember: true,
    }),
  });

  const passwordJSON = (await passwordResponse.json()) as AuthResponse;
  const accessToken = passwordJSON.accessToken;
  const accountId = passwordJSON.primaryAccounts?.["urn:ietf:params:jmap:mail"];

  if (accessToken && accountId) {
    return {
      type: "session",
      value: { accountId, accessToken, loginId },
    };
  }

  if (!passwordJSON.methods) {
    throw new Error(
      "Fastmail did not respond with an access token and didn't provide follow-up methods of authentication"
    );
  }

  const totp = passwordJSON.methods.find((method: { type: string }) => {
    return method.type === "totp";
  });

  if (!totp) {
    throw new Error(
      "Fastmail did not respond with an access token and didn't provide follow-up methods of authentication"
    );
  }

  return { type: "totp", loginId };
};

export interface AuthenticateProps {
  username: string;
  password: string;
  didAuthenticate: (session: Session) => void;
}

export default function Authenticate({ username, password, didAuthenticate }: AuthenticateProps) {
  const [loginId, setLoginId] = useState<string | undefined>();
  const [isLoading, setLoading] = useState(true);
  const [totp, setTOTP] = useState<string>("");
  const [submitTOTP, setSubmitTOTP] = useState(false);

  const isTOTPRequired = !!loginId;

  useEffect(() => {
    (async () => {
      const result = await authenticate(username, password);

      switch (result.type) {
        case "session":
          setLoading(false);
          didAuthenticate(result.value);
          break;

        case "totp":
          setLoginId(result.loginId);
          setLoading(false);
          break;
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!loginId || !totp || !submitTOTP) {
        return;
      }

      setLoading(true);
      const totpResponse = await fetch(authenticateURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ loginId, remember: true, type: "totp", value: totp }),
      });

      const response = (await totpResponse.json()) as AuthResponse;

      const accessToken = response.accessToken;
      const accountId = response.primaryAccounts?.["urn:ietf:params:jmap:mail"];

      if (!accessToken || !accountId) {
        setLoading(false);
        setSubmitTOTP(false);
        setTOTP("");
        showToast({ style: Toast.Style.Failure, title: "Sorry, thatʼs not the right code. Please try again." });
        return;
      }

      setLoading(false);
      setSubmitTOTP(false);
      didAuthenticate({ accountId, accessToken, loginId });
    })();
  }, [submitTOTP]);

  return isTOTPRequired ? (
    <Form
      isLoading={isLoading}
      navigationTitle="Two-step verification"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={() => setSubmitTOTP(true)} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter the 6-digit code from the authenticator app on your phone:" />
      <Form.TextField id="totp" value={totp} onChange={setTOTP} />
    </Form>
  ) : (
    <Detail isLoading={true} />
  );
}
