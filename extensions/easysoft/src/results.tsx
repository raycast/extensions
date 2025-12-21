import { useState, useEffect } from "react";
import { showToast, Toast, Detail } from "@raycast/api";
import { LoginForm } from "./components/LoginForm";
import { ManualSessionForm } from "./components/ManualSessionForm";
import { ResultsView } from "./components/ResultsView";
import { getStoredSession, clearStoredSession } from "./config";
import { logout } from "./api/auth";

type ViewState = "login" | "manual-session" | "results" | "checking";

export default function Command() {
  const [viewState, setViewState] = useState<ViewState>("checking");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    console.log("[RESULTS] Checking for stored session...");
    try {
      const session = await getStoredSession();
      console.log("[RESULTS] Stored session exists:", !!session);
      if (session) {
        console.log("[RESULTS] Session found, showing results view");
        setViewState("results");
      } else {
        console.log("[RESULTS] No session found, showing login form");
        setViewState("login");
      }
    } catch (error) {
      console.error("[RESULTS] Error checking session:", error);
      setViewState("login");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      await clearStoredSession();
      setViewState("login");
      await showToast({
        style: Toast.Style.Success,
        title: "Logged out",
        message: "You have been logged out successfully",
      });
    } catch (error) {
      await clearStoredSession();
      setViewState("login");
      await showToast({
        style: Toast.Style.Failure,
        title: "Logout error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function handleLoginSuccess() {
    setViewState("results");
  }

  function handleManualSession() {
    setViewState("manual-session");
  }

  function handleSessionSet() {
    setViewState("results");
  }

  function handleCancelManual() {
    setViewState("login");
  }

  if (isLoading) {
    return <Detail markdown="Loading..." />;
  }

  if (viewState === "login") {
    return <LoginForm key="login-form" onLoginSuccess={handleLoginSuccess} onManualSession={handleManualSession} />;
  }

  if (viewState === "manual-session") {
    return (
      <ManualSessionForm key="manual-session-form" onSessionSet={handleSessionSet} onCancel={handleCancelManual} />
    );
  }

  return <ResultsView onLogout={handleLogout} />;
}
