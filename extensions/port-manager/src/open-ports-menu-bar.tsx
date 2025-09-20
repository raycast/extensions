import {
  MenuBarExtra,
  getPreferenceValues,
  openCommandPreferences,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import Huds from "./feedback/Huds";
import useProcesses from "./hooks/useProcesses";
import { KillSignal, killProcess } from "./utilities/killProcess";
import removeDuplicates from "./utilities/removeDuplicates";

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  const { processes, revalidateProcesses, isLoadingProcesses } = useProcesses();

  const openPorts = removeDuplicates(
    processes
      ?.filter((p) => p.portInfo !== undefined && p.portInfo.length > 0)
      ?.flatMap((p) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return p.portInfo!.map((info) => ({ port: `${info.port}`, name: info.name, process: p }));
      }) ?? [],
    "port"
  ).sort((a, b) => parseInt(a.port) - parseInt(b.port));

  return (
    <MenuBarExtra
      isLoading={isLoadingProcesses}
      icon={{ source: { light: "menu-bar-icon-light.png", dark: "menu-bar-icon-dark.png" } }}
    >
      <MenuBarExtra.Section title="Open Ports">
        {openPorts.map((openPort) => (
          <MenuBarExtra.Submenu
            key={openPort.port}
            title={`${openPort.port}${openPort.name ? ` (${openPort.name})` : ""} ⋅ ${
              openPort.process.name ?? "Untitled Process"
            }`}
          >
            <MenuBarExtra.Section title={openPort.process.name ?? "Untitled Process"}>
              <MenuBarExtra.Item
                title={`Kill Process (PID ${openPort.process.pid})`}
                onAction={async () => {
                  await killProcess(openPort.process, {
                    onError() {
                      showHUD(Huds.KillProcess.Error({ name: openPort.process.name, port: openPort.port }));
                    },
                    onKilled() {
                      showHUD(Huds.KillProcess.Success({ name: openPort.process.name, port: openPort.port }));
                      revalidateProcesses();
                    },
                    killSignal: preferences.killSignal === "ask" ? KillSignal.TERM : preferences.killSignal,
                  });
                }}
              />
              <MenuBarExtra.Item
                title={`Killall Process (PID ${openPort.process.pid})`}
                onAction={async () => {
                  await killProcess(openPort.process, {
                    killAll: true,
                    onError() {
                      showHUD(Huds.KillProcess.Error({ name: openPort.process.name, port: openPort.port }));
                    },
                    onKilled() {
                      showHUD(Huds.KillProcess.Success({ name: openPort.process.name, port: openPort.port }));
                      revalidateProcesses();
                    },
                    killSignal: preferences.killSignal === "ask" ? KillSignal.TERM : preferences.killSignal,
                  });
                }}
              />
            </MenuBarExtra.Section>
          </MenuBarExtra.Submenu>
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Preferences">
        <MenuBarExtra.Item
          title="Command Preferences"
          onAction={async () => {
            await openCommandPreferences();
          }}
        />
        <MenuBarExtra.Item
          title="Extension Preferences"
          onAction={async () => {
            await openExtensionPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
