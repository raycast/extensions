import { LocalStorage } from "@raycast/api";
import { login } from "./api";

const STORAGE_TOKEN_KEY = "auth_token";

export const authenticate = async (email: string, password: string): Promise<boolean> => {
  const token = await login(email, password);

  if (!token) {
    return false;
  }

  try {
    await LocalStorage.setItem(STORAGE_TOKEN_KEY, token);
    return true;
  } catch (error) {
    return false;
  }
};

export const getToken = async () => {
  return await LocalStorage.getItem(STORAGE_TOKEN_KEY);
};

export const removeToken = async () => {
  return await LocalStorage.removeItem(STORAGE_TOKEN_KEY)
}

export const isAuthenticated = async () => !!(await getToken());
