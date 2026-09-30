import { useEffect, useRef, useState } from "react";
import { NodeVersion } from "../lib/types/nodeVersion";
import { PHPVersion } from "../lib/types/phpVersion";
import { Site } from "../lib/types/site";
import { Herd } from "../utils/Herd";
import { showFailureToast } from "@raycast/utils";
import { rescue } from "../utils/rescue";
import { closeMainWindow, showHUD, showToast } from "@raycast/api";

interface State {
  loading: boolean;
  sites: Site[];
  phpVersions: PHPVersion[];
  nodeVersions: NodeVersion[];
}

export function useSitesState() {
  const [state, setState] = useState<State>({ loading: false, sites: [], phpVersions: [], nodeVersions: [] });

  const hasLoaded = useRef(false);

  async function getSites() {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    try {
      setState((prevState) => ({ ...prevState, loading: true }));

      const sites = await Herd.Sites.all();

      const phpVersions = await Herd.PHP.installed();
      const nodeVersions = await Herd.Node.installed();

      setState({ loading: false, sites: sites, phpVersions: phpVersions, nodeVersions: nodeVersions });
    } catch (error) {
      setState((prevState) => ({ ...prevState, loading: false }));
      showFailureToast(error, { title: "Could not fetch sites" });
    }
  }
  useEffect(() => {
    getSites();
  }, []);

  async function open() {
    await closeMainWindow();
    await rescue(() => Herd.Sites.open(), "Could not open Sites Overview.");
  }

  async function openWizard() {
    await closeMainWindow();
    await rescue(() => Herd.Sites.openWizard(), "Could not open Sites Wizard.");
  }

  async function openInIDE(site: Site): Promise<void> {
    await showHUD("Opening IDE for " + site.site);
    await rescue(() => Herd.Sites.openInIDE(site), "Could not open IDE.");
  }

  async function openInBrowser(site: Site): Promise<void> {
    await showHUD(`Opening ${site.site} in Browser...`);
    await rescue(() => Herd.Sites.openInBrowser(site), "Could not open Site in Browser.");
  }

  async function openDatabase(site: Site): Promise<void> {
    await showHUD(`Opening ${site.site} database...`);
    await rescue(() => Herd.Sites.openDatabase(site), "Could not open Database for Site.");
  }

  async function openLogs(site: Site): Promise<void> {
    await showHUD(`Opening Log Viewer for ${site.site}...`);
    await rescue(() => Herd.Sites.openLogs(site.path), "Could not open Log Viewer for Site.");
  }

  async function openTerminal(site: Site): Promise<void> {
    await showHUD(`Opening Terminal for ${site.site}...`);
    await rescue(() => Herd.ExternalApps.openTerminal(site.path), "Could not open Terminal for Site.");
  }

  async function openTinker(site: Site): Promise<void> {
    await showHUD(`Opening Tinker for ${site.site}...`);
    await rescue(() => Herd.ExternalApps.openTinker(site.path), "Could not open Tinker for Site.");
  }

  function parseSiteEnv(site: Site): string {
    if (!site.env) return `### No .env file found`;

    return ["### .env", "```env", site.env?.trim(), "```"].join("\n").trimEnd();
  }

  async function toggleSecure(site: Site): Promise<void> {
    if (state.loading) {
      return;
    }

    setState((prevState) => ({ ...prevState, loading: true }));

    if (site.secured) {
      await unsecure(site);
    } else {
      await secure(site);
    }

    await reload();
  }

  async function secure(site: Site): Promise<void> {
    if (await rescue(() => Herd.Sites.secure(site), `Could not secure Site ${site.site}.`)) {
      showToast({ title: `Secured ${site.site}.` });
    }
  }

  async function unsecure(site: Site): Promise<void> {
    if (await rescue(() => Herd.Sites.unsecure(site), `Could not unsecure Site ${site.site}.`)) {
      showToast({ title: `Unsecured ${site.site}.` });
    }
  }

  async function isolatePHP(site: Site, phpVersion: PHPVersion): Promise<void> {
    if (state.loading) {
      return;
    }

    setState((prevState) => ({ ...prevState, loading: true }));

    if (await rescue(() => Herd.Sites.isolate(site, phpVersion.cycle), `Could not isolate Site ${site.site}.`)) {
      showToast({ title: `Isolated ${site.site} to PHP ${phpVersion.cycle}` });
    }

    await reload();
  }

  async function unisolatePHP(site: Site): Promise<void> {
    if (state.loading) {
      return;
    }

    setState((prevState) => ({ ...prevState, loading: true }));
    if (await rescue(() => Herd.Sites.unisolate(site), `Could not unisolate Site ${site.site}.`)) {
      showToast({ title: `${site.site} now uses global PHP.` });
    }

    await reload();
  }

  async function isolateNode(site: Site, nodeVersion: NodeVersion): Promise<void> {
    if (state.loading) {
      return;
    }

    setState((prevState) => ({ ...prevState, loading: true }));

    if (await rescue(() => Herd.Sites.isolateNode(site, nodeVersion.cycle), `Could not isolate Site ${site.site}.`)) {
      showToast({ title: `Isolated ${site.site} to Node ${nodeVersion.cycle}` });
    }

    await reload();
  }

  async function unisolateNode(site: Site): Promise<void> {
    if (state.loading) {
      return;
    }

    setState((prevState) => ({ ...prevState, loading: true }));
    if (await rescue(() => Herd.Sites.unisolateNode(site), `Could not unisolate Site ${site.site}.`)) {
      showToast({ title: `${site.site} now uses global Node.` });
    }

    await reload();
  }

  async function reload(): Promise<void> {
    Herd.Sites.clearCache();
    hasLoaded.current = false;
    await getSites();
  }

  return {
    state,
    actions: {
      open,
      openWizard,
      openInIDE,
      openInBrowser,
      openDatabase,
      openLogs,
      openTerminal,
      openTinker,
      parseSiteEnv,
      toggleSecure,
      isolatePHP,
      unisolatePHP,
      isolateNode,
      unisolateNode,
    },
  };
}
