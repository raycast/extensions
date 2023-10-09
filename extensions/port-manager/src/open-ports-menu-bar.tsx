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

  function groupBy<T>(items: T[], callbackFn: (item: T) => string): { [key: string]: T[] } {
    const groupedItems: { [key: string]: T[] } = {};
    for (const item of items) {
      const key = callbackFn(item);
      if (!groupedItems[key]) groupedItems[key] = [];
      groupedItems[key].push(item);
    }
    return groupedItems;
  }

  function convertObjectToArray(obj: { [key: string]: { port: string, process: string }[] }): { name: string, port: { port: string, process: string }[] }[] {
    return Object.entries(obj).map(([name, port]) => ({ name, port }));
  }

  function sortByName(arr: { name: string, port: string }[]): { name: string, port: string }[] {
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  }

  function putSpaceOnCapitalLetters(name: string) {
    return name.replace(/([A-Z])/g, ' $1').trim()
  }

  let cloneOpenPort = Object.assign([], openPorts, []);
  if (preferences.sortPort) cloneOpenPort = cloneOpenPort.sort((x, y) => parseInt(x.port) - parseInt(y.port));
  if (preferences.groupByProcess) {
    cloneOpenPort = groupBy(cloneOpenPort, ({ process: { name } }) => name);
    cloneOpenPort = convertObjectToArray(cloneOpenPort);
    cloneOpenPort = sortByName(cloneOpenPort);

    return (
      <MenuBarExtra
        isLoading={isLoading}
        icon={{ source: { light: "menu-bar-icon-light.png", dark: "menu-bar-icon-dark.png" } }}
      >
        {cloneOpenPort.map((openPort) => {
          const len = openPort.port.length > 1 ? `(${openPort.port.length})` : "";
          return (<MenuBarExtra.Submenu key={openPort.name} title={` ${putSpaceOnCapitalLetters(openPort.name)} ${len}`}>

            {openPort.port.map((openPort2) => (
              <MenuBarExtra.Item
                key={openPort2.port}
                title={`Kill (${openPort2.port ?? "Untitled Process"})`}
                onAction={async () => {
                  await killProcess(openPort2.process, {
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
            ))}

          </MenuBarExtra.Submenu>
          )
        })}
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: { light: "menu-bar-icon-light.png", dark: "menu-bar-icon-dark.png" } }}
    >
      {cloneOpenPort.map((openPort) => (
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
