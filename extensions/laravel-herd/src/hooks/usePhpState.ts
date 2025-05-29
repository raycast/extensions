import { useEffect, useRef, useState } from "react";
import { PHPVersion } from "../lib/types/phpVersion";
import { showFailureToast } from "@raycast/utils";
import { Herd } from "../utils/Herd";
import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { rescue } from "../utils/rescue";

interface State {
  loading: boolean;
  versions: PHPVersion[];
  currentVersion: string;
}

export function usePhpState() {
  const [state, setState] = useState<State>({
    loading: true,
    versions: [],
    currentVersion: "",
  });

  const hasLoaded = useRef(false);

  async function getPHPVersions() {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    try {
      setState((prevState) => ({ ...prevState, loading: true }));

      const versions = await Herd.PHP.all();
      const currentVersion = await Herd.PHP.current();

      setState({ loading: false, versions, currentVersion });
    } catch (error) {
      showFailureToast(error, { title: "Could not fetch PHP versions." });
    }
  }

  useEffect(() => {
    getPHPVersions();
  }, []);

  async function open() {
    await closeMainWindow();
    await rescue(() => Herd.General.openSettings("php"), "Could not open PHP Overview.");
  }

  async function setGlobalPhpVersion(version: string) {
    if (state.loading) {
      return;
    }

    setState((prevState) => ({ ...prevState, loading: true }));

    if (await rescue(() => Herd.PHP.setAsGlobalPHP(version), "Could not set Global PHP version.")) {
      showToast({ title: "Global PHP version changed." });
    }

    hasLoaded.current = false;
    await getPHPVersions();
  }

  async function installPHPVersion(version: string) {
    if (state.loading) {
      return;
    }

    setState((prevState) => ({ ...prevState, loading: true }));

    showToast({ title: `Installing PHP ${version}...`, style: Toast.Style.Animated });

    if (await rescue(() => Herd.PHP.installPHPVersion(version), "Could not install PHP version.")) {
      showToast({ title: `Installed PHP ${version}.` });
    }

    await reload();
  }

  async function updatePHPVersion(version: string) {
    if (state.loading) {
      return;
    }

    setState((prevState) => ({ ...prevState, loading: true }));

    showToast({ title: `Updating PHP ${version}...`, style: Toast.Style.Animated });

    if (await rescue(() => Herd.PHP.updatePHPVersion(version), "Could not update PHP Version.")) {
      showToast({ title: `Updated PHP ${version}` });
    }

    await reload();
  }

  async function reload(): Promise<void> {
    Herd.PHP.clearCache();
    hasLoaded.current = false;
    await getPHPVersions();
  }

  return {
    state,
    actions: {
      open,
      setGlobalPhpVersion,
      installPHPVersion,
      updatePHPVersion,
    },
  };
}
