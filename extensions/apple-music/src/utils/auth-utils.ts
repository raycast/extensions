import fetch from "node-fetch";
import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchAppleMusic } from "./apple-music-api";

export async function getDevToken() {
  const cachedToken = await LocalStorage.getItem("dev-token");

  if (cachedToken) {
    const { token, expires } = JSON.parse(cachedToken as string);

    if (new Date(expires) > new Date()) {
      return token;
    }
  }

  const { token, expires } = (await fetch("https://raycast-music-login.gbgk.dev/get-dev-token").then((res) =>
    res.json()
  )) as {
    token: string;
    expires: string;
  };

  await LocalStorage.setItem("dev-token", JSON.stringify({ token, expires }));

  return token;
}

export async function getMusicUserToken(): Promise<string | undefined> {
  return LocalStorage.getItem("music-user-token");
}

export async function setMusicUserToken(token: string) {
  await LocalStorage.setItem("music-user-token", token);
  const { data } = (await fetchAppleMusic("/v1/me/storefront").then((res) => res.json())) as { data: { id: string }[] };
  await LocalStorage.setItem("storefront", data[0].id);
}

export async function getStorefront(): Promise<string> {
  const storedStorefront = (await LocalStorage.getItem("storefront")) as string | undefined;
  return storedStorefront ? storedStorefront : "us";
}

export function useIsLoggedIn() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  function refresh() {
    setIsLoading(true);
    getMusicUserToken().then((token) => {
      setIsLoggedIn(!!token);
      setIsLoading(false);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  return { isLoggedIn, isLoading, refresh };
}
