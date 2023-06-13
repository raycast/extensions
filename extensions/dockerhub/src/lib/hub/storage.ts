import { LocalStorage } from "@raycast/api";

const tokenKey = "DOCKER_HUB_TOKEN";

export const saveToken = async (token: string) => {
  await LocalStorage.setItem(tokenKey, token);
};

export const getToken = async (): Promise<string> => {
  const token = await LocalStorage.getItem(tokenKey);
  return token?.toString() ?? "";
};

export const deleteToken = async (): Promise<void> => {
  await LocalStorage.removeItem(tokenKey);
};
