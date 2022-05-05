import { getPreferenceValues, LocalStorage, Form, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import nodeFetch, { Response } from "node-fetch";
import fetchCookie from "fetch-cookie";

const cookieJar = new fetchCookie.toughCookie.CookieJar();
const fetch = fetchCookie(nodeFetch, cookieJar);

interface Preferences {
  hostname: string;
  username: string;
  password: string;
}

interface JMAPPrimaryAccounts {
  "urn:ietf:params:jmap:mail": string;
}

interface JMAPSession {
  primaryAccounts: JMAPPrimaryAccounts;
}

const { hostname, username, password } = getPreferenceValues<Preferences>();

const authenticateURL = "https://www.fastmail.com/jmap/authenticate/";
interface UsernameAuthRequest {
  username: string;
}

interface UsernameAuthResponse {
  mayTrustDevice?: boolean;
  methods?: [{ type: "password" }];
  loginId?: string;
}

interface PasswordAuthRequest {
  loginId: string;
  remember: true;
  type: "password";
  value: string;
}

interface PasswordAuthResponse {
  accessToken?: string;
  methods?: [{ type: string }];
}

interface TOTPAuthRequest {
  loginId: string;
  remember: true;
  type: "totp";
  value: string;
}

type AccessToken = string;

const sendAuthRequest = async (
  data: UsernameAuthRequest | PasswordAuthRequest | TOTPAuthRequest
): Promise<Response> => {
  console.log("data", data);
  const response = await fetch(authenticateURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  console.log("jar", cookieJar.store);
  console.log("status", response.status);

  return response;
};

type AuthenticationResult = { type: "AccessToken"; value: AccessToken } | { type: "totp"; loginId: string };

const authenticate = async (username: string, password: string): Promise<AuthenticationResult> => {
  const usernameAuthResponse = await sendAuthRequest({ username });

  const json = (await usernameAuthResponse.json()) as UsernameAuthResponse;

  const { loginId } = json;

  if (!loginId) {
    throw "Unable to authenticate";
  }

  const response = await sendAuthRequest({
    loginId,
    type: "password",
    value: password,
    remember: true,
  });

  const passwordJSON = (await response.json()) as PasswordAuthResponse;
  if (passwordJSON.accessToken) {
    return { type: "AccessToken", value: passwordJSON.accessToken };
  }

  console.log("password", passwordJSON);

  if (!passwordJSON.methods) {
    throw "Unable to authenticate";
  }

  const totp = passwordJSON.methods.find((method: { type: string }) => {
    return method.type === "totp";
  });

  if (!totp) {
    throw "Unable to authenticate";
  }

  return { type: "totp", loginId };
};

export default function Command() {
  const [accessToken, setAccessToken] = useState<AccessToken | undefined>(undefined);
  const [authenticationResult, setAuthenticationResult] = useState<{ type: "totp"; loginId: string } | undefined>(
    undefined
  );
  const [totp, setTOTP] = useState<string | undefined>(undefined);
  const isLoading = !accessToken || !authenticationResult || !totp;

  console.log("accessToken", accessToken);
  console.log("authenticationResult", authenticationResult);
  console.log("totp", totp);
  console.log("isLoading", isLoading);

  useEffect(() => {
    if (accessToken) {
      return accessToken;
    }

    const auth = async () => {
      const authenticateResponse = await authenticate(username, password);

      switch (authenticateResponse.type) {
        case "AccessToken":
          setAccessToken(authenticateResponse.value);
          break;

        case "totp":
          setAuthenticationResult(authenticateResponse);
          break;
      }
    };

    auth();
  }, [accessToken]);

  useEffect(() => {
    if (!totp || !authenticationResult) {
      return;
    }

    const auth = async () => {
      const result = await sendAuthRequest({
        loginId: authenticationResult.loginId,
        remember: true,
        type: "totp",
        value: totp,
      });

      const response = (await result.json()) as { accessToken?: AccessToken };

      if (!response.accessToken) {
        throw "Unable to authenticate";
      }

      setAccessToken(response.accessToken);
    };

    auth();
  }, [totp, authenticationResult]);

  if (accessToken) {
    return (
      <Form
        navigationTitle="New masked email"
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={(values: { totp: string }) => setTOTP(values.totp)} />
          </ActionPanel>
        }
      >
        <Form.Description text="Reminder yourself what this email is for" />
        <Form.TextField id="label" title="Description" />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Two-step verification"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(values: { totp: string }) => setTOTP(values.totp)} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter the 6-digit code from the authenticator app on your phone:" />
      <Form.TextField id="totp" />
    </Form>
  );
}
