import { useCallback, useEffect, useState } from "react";
import { Cache, LocalStorage, showToast, Toast } from "@raycast/api";
import {
  getAccessToken,
  logout as logoutApi,
  requestEmailMagicLink as requestEmailMagicLinkApi,
  signInWithGoogle as signInWithGoogleApi,
  verifyEmailMagicLink as verifyEmailMagicLinkApi,
} from "../api/auth";
import { formatRaycastError, getAuthIdentityFromToken } from "../utils";

const extensionCache = new Cache();

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function auth() {
      try {
        const existingToken = await getAccessToken();
        setToken(existingToken);
      } catch (error) {
        const userError = formatRaycastError(error);
        showToast({
          style: Toast.Style.Failure,
          title: userError.title,
          message: userError.description,
        });
      } finally {
        setIsLoading(false);
      }
    }

    auth();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const newToken = await signInWithGoogleApi();
      setToken(newToken);
      return true;
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestEmailMagicLink = useCallback(async (email: string) => {
    try {
      await requestEmailMagicLinkApi(email);
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
      throw error;
    }
  }, []);

  const verifyEmailMagicLink = useCallback(async (magicLinkOrToken: string) => {
    setIsLoading(true);
    try {
      const newToken = await verifyEmailMagicLinkApi(magicLinkOrToken);
      setToken(newToken);
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutApi();
      await LocalStorage.clear();
      extensionCache.clear();
      setToken(null);
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authIdentity = getAuthIdentityFromToken(token);

  return {
    token,
    authIdentity,
    isLoading,
    isAuthenticated: !!token,
    reauthorize: signInWithGoogle,
    signInWithGoogle,
    requestEmailMagicLink,
    verifyEmailMagicLink,
    signOut,
  };
}
