/**
 * Authentication hook for Cleyo Raycast extension
 */

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  isAuthenticated,
  initAuth,
  openAuthPage,
  pollForCompletion,
  disconnect,
} from "../lib/auth";

export type AuthState =
  | "checking"
  | "not_connected"
  | "connecting"
  | "connected";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      const authenticated = await isAuthenticated();
      if (!cancelled) {
        setAuthState(authenticated ? "connected" : "not_connected");
      }
    }
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConnect() {
    setAuthState("connecting");
    try {
      const linkData = await initAuth();
      await openAuthPage(linkData.link_url);
      const token = await pollForCompletion(linkData.token);
      if (token) {
        setAuthState("connected");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Connection failed",
        message: error instanceof Error ? error.message : "Please try again",
      });
      setAuthState("not_connected");
    }
  }

  async function handleSignOut() {
    await disconnect();
    await showToast({
      style: Toast.Style.Success,
      title: "Signed out",
      message: "You have been disconnected from Cleyo",
    });
    setAuthState("not_connected");
  }

  return {
    authState,
    handleConnect,
    handleSignOut,
  };
}
