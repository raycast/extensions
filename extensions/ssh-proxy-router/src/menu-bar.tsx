import { Color, Icon, MenuBarExtra, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  getPrimaryURL,
  getProxyStatus,
  getRoutedWebsites,
  ProxyStatus,
  shouldOpenInSafari,
  startProxy,
  testProxy,
  toggleProxy,
} from "./proxy";

export default function Command() {
  const [status, setStatus] = useState<ProxyStatus>();
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setStatus(await getProxyStatus());
    } catch (error) {
      setStatus({
        running: false,
        degraded: true,
        detail: error instanceof Error ? error.message : String(error),
        tunnel: false,
        pacServer: false,
        routing: false,
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle() {
    setIsLoading(true);
    try {
      const result = await toggleProxy();
      await showToast({
        style: Toast.Style.Success,
        title: result.running ? "SSH Proxy Router active" : "SSH Proxy Router stopped",
        message: result.message,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "SSH Proxy Router failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    await refresh();
  }

  async function openWebsite(url: string) {
    const current = await getProxyStatus();
    if (!current.running) {
      setIsLoading(true);
      try {
        await startProxy();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not start SSH Proxy Router",
          message: error instanceof Error ? error.message : String(error),
        });
        await refresh();
        return;
      }
    }
    await open(url, shouldOpenInSafari() ? "com.apple.Safari" : undefined);
    await refresh();
  }

  async function test() {
    setIsLoading(true);
    try {
      const message = await testProxy();
      await showToast({ style: Toast.Style.Success, title: "Routed websites are reachable", message });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Website test failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    await refresh();
  }

  const running = status?.running ?? false;
  const degraded = status?.degraded ?? false;
  const routedWebsites = getRoutedWebsites();

  return (
    <MenuBarExtra
      icon={{ source: Icon.Network, tintColor: running ? Color.Green : Color.SecondaryText }}
      tooltip={status?.detail ?? "Checking SSH Proxy Router…"}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        title={
          running
            ? "Website routing is active"
            : degraded
              ? "Website routing needs repair"
              : "Website routing is stopped"
        }
        subtitle={status?.detail}
        icon={{ source: degraded ? Icon.Hammer : Icon.Network, tintColor: running ? Color.Green : Color.SecondaryText }}
        onAction={refresh}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={running ? "Stop SSH Proxy Router" : degraded ? "Repair SSH Proxy Router" : "Start SSH Proxy Router"}
        icon={running ? Icon.StopFilled : degraded ? Icon.Hammer : Icon.PlayFilled}
        onAction={toggle}
      />
      <MenuBarExtra.Item title="Open Primary Website" icon={Icon.Globe} onAction={() => openWebsite(getPrimaryURL())} />
      <MenuBarExtra.Submenu title="Open Routed Website" icon={Icon.Globe}>
        {routedWebsites.map((website) => (
          <MenuBarExtra.Item
            key={`${website.title}-${website.url}`}
            title={website.title}
            onAction={() => openWebsite(website.url)}
          />
        ))}
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Item title="Test Routed Websites" icon={Icon.CheckCircle} onAction={test} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Extension Settings…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <MenuBarExtra.Item title="Refresh Status" icon={Icon.ArrowClockwise} onAction={refresh} />
    </MenuBarExtra>
  );
}
