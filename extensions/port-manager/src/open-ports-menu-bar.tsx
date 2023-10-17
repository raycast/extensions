import { MenuBarExtra, getPreferenceValues, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import useProcesses from "./hooks/useProcesses";
import { KillSignal, killProcess } from "./utilities/killProcess";

function removeDuplicates<T>(array: T[], key: keyof T) {
  return array.filter((v, i, a) => a.findIndex((t) => t[key] === v[key]) === i);
}

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  const [processes, reload] = useProcesses();
  const isLoading = useLoadingTimeout(processes.length === 0, 1000);

  const openPorts = removeDuplicates(
    processes
      .filter((p) => p.portInfo !== undefined && p.portInfo.length > 0)
      .flatMap((p) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return p.portInfo!.map((info) => ({ port: `${info.port}`, process: p }));
      }),
    "port"
  );

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: { light: "menu-bar-icon-light.png", dark: "menu-bar-icon-dark.png" } }}
    >
      {openPorts.map((openPort) => (
        <MenuBarExtra.Submenu key={openPort.port} title={openPort.port}>
          <MenuBarExtra.Section title={openPort.process.name ?? "Untitled Process"}>
            <MenuBarExtra.Item
              title="Kill"
              onAction={async () => {
                await killProcess(openPort.process, {
                  onError() {
                    showHUD("⚠️ Failed to kill process");
                  },
                  onKilled() {
                    reload();
                  },
                  killSignal: preferences.killSignal === "ask" ? KillSignal.TERM : preferences.killSignal,
                });
              }}
            />
          </MenuBarExtra.Section>
        </MenuBarExtra.Submenu>
      ))}
    </MenuBarExtra>
  );
}

function useLoadingTimeout(current: boolean, timeout: number) {
  const [isLoading, setIsLoading] = useState(current);

  useEffect(() => {
    if (current) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [current, timeout]);

  return isLoading;
}
