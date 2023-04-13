import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { Preferences } from "./types";
import { useLoginMutation } from "../graphql/login.hook";
import { apolloClient } from "./apolloClient";
import { useUserLazyQuery } from "../graphql/user.hook";

export const useLogin = () => {
  const { username, password } = getPreferenceValues<Preferences>();
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [token, setToken] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const [useLoginMut] = useLoginMutation({ client: apolloClient });
  const [useUserQ] = useUserLazyQuery({ client: apolloClient });

  const login = async () => {
    setError(undefined);
    setLoading(true);
    try {
      const { errors, data } = await useLoginMut({
        client: apolloClient,
        variables: { username, password, deviceName: "Raycast Extension" },
      });

      setLoading(false);

      if (errors) {
        console.error("Failed to request token", errors);
        setError(errors?.[0]?.message);
        return;
      }

      if (data?.login?.token) {
        setToken(data.login.token);
        setLoggedIn(true);
        setError(undefined);
        LocalStorage.setItem("token", data.login.token);
        return;
      }
    } catch (e: any) {
      setLoading(false);
      console.error("Failed to request token", e);
      setError(e.message);
      return;
    }

    setError("Failed to login");
  };

  const validateToken = async () => {
    try {
      const { data } = await useUserQ({ client: apolloClient });
      return !!data?.currentUser?.id;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    if (loading) {
      return;
    }

    setLoading(true);

    console.info("Starting login process...");

    LocalStorage.getItem("token").then(async (storedToken) => {
      if (storedToken) {
        console.info("Got stored token. Validating token.");
        if (!(await validateToken())) {
          console.info("Token invalid. Using persisted credentials to login.");
          await login();
          return;
        }
        console.info("Stored token is valid");
        setToken(storedToken.toString());
        setLoggedIn(true);
        setLoading(false);
      } else {
        console.info("No stored token found");
        void login();
      }
    });
  }, []);

  return { loggedIn, token, error, loading };
};
