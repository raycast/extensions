import { Icon, launchCommand, LaunchType, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getStatus } from "./desk";

function run(name: string) {
  return async () => {
    try {
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch {
      // The launched command reports its own errors.
    }
  };
}

export default function MenuBarMove() {
  const { data, isLoading, error } = useCachedPromise(getStatus, [], {
    failureToastOptions: { title: "Couldn't read desk height" },
  });

  return (
    <MenuBarExtra icon={Icon.ChevronUpDown} tooltip="Move desk" isLoading={isLoading}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={data ? `${data.name}: ${data.heightCm.toFixed(1)} cm` : error ? "Desk unavailable" : "Reading height…"}
          icon={Icon.Ruler}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Stand Up"
          icon={Icon.ChevronUp}
          onAction={run("move-to-stand")}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
        />
        <MenuBarExtra.Item
          title="Sit Down"
          icon={Icon.ChevronDown}
          onAction={run("move-to-sit")}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
        />
        <MenuBarExtra.Item
          title="Raise Desk"
          icon={Icon.ArrowUp}
          onAction={run("step-up")}
          shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
        />
        <MenuBarExtra.Item
          title="Lower Desk"
          icon={Icon.ArrowDown}
          onAction={run("step-down")}
          shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
        />
        <MenuBarExtra.Item
          title="Stop"
          icon={Icon.Stop}
          onAction={run("stop-desk")}
          shortcut={{ modifiers: ["cmd"], key: "0" }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Select Desk…" icon={Icon.MagnifyingGlass} onAction={run("select-desk")} />
        <MenuBarExtra.Item title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
