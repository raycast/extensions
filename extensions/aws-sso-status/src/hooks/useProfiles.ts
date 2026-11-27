import { signInWithToast } from "../sign-in";
import { showToast, Toast, launchCommand, LaunchType, environment } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProfileStatus, SsoProfile } from "../aws/types";
import { coordinator, effectiveSettings, readSnapshot, savePrimary, saveSnapshot } from "../runtime";
import { scopeFor } from "../aws/coordinator";
import { sessionKey } from "../aws/store";
export function useProfiles() {
  const [settings, setSettings] = useState(effectiveSettings);
  const [snapshot, setSnapshot] = useState(() => readSnapshot(settings));
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const busy = useRef(false);
  const onSignOut = useCallback(async (profile: SsoProfile) => {
    await showToast({
      style: Toast.Style.Failure,
      title: "AWS Sign-In Required",
      message: profile.sessionName || profile.name,
      primaryAction: {
        title: "Sign In",
        onAction: () =>
          launchCommand({
            name: "aws-sso-sign-in",
            type: LaunchType.UserInitiated,
            arguments: { profile: profile.name },
          }),
      },
      secondaryAction: {
        title: "Open AWS SSO Status",
        onAction: () => launchCommand({ name: "aws-sso-status", type: LaunchType.UserInitiated }),
      },
    });
  }, []);
  const runRefresh = useCallback(
    async (force = false, onlyProfile?: string, onlySession?: string) => {
      if (busy.current) return;
      busy.current = true;
      setLoading(true);
      try {
        const next = await coordinator.refresh(settings, { force, onlyProfile, onlySession, onSignOut });
        setSnapshot(next);
        saveSnapshot(settings, next);
      } catch {
        setSnapshot((previous) => ({
          ...previous,
          notice: "Unable to check AWS status. Try refreshing.",
          profiles: previous.profiles.map((item) => ({ ...item, stale: true })),
        }));
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [settings, onSignOut],
  );
  useEffect(() => {
    void runRefresh();
  }, [runRefresh]);
  const refresh = () => runRefresh(true);
  const refreshOne = (item: ProfileStatus) => runRefresh(true, item.profile.name);
  const signIn = async (item: ProfileStatus) => {
    if (busy.current) return;
    busy.current = true;
    setSigningIn(true);
    try {
      await signInWithToast(item.profile, settings);
    } finally {
      busy.current = false;
      await runRefresh(false, undefined, sessionKey(item.profile, scopeFor(settings)));
      setSigningIn(false);
      if (environment.commandName === "aws-sso-status") {
        try {
          await launchCommand({ name: "aws-sso-menu-bar", type: LaunchType.Background });
        } catch {
          /* Menu may be disabled. */
        }
      }
    }
  };
  const selectProfile = async (name?: string) => {
    const updated = savePrimary(name);
    setSettings(updated);
    if (environment.commandName !== "aws-sso-menu-bar") {
      try {
        await launchCommand({ name: "aws-sso-menu-bar", type: LaunchType.Background });
      } catch {
        /* Menu may be disabled. */
      }
    }
  };
  return { ...snapshot, settings, loading, signingIn, refresh, refreshOne, signIn, selectProfile };
}
