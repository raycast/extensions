import {
  Action,
  ActionPanel,
  closeMainWindow,
  environment,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { useCallback, useEffect, useState } from "react";
import {
  emulatorLaunchHelperPath,
  emulatorLaunchLogPath,
  execute,
  getToolchain,
  listAvds,
  nextEmulatorPort,
  runningAvds,
  spawnDetached,
  type EmulatorItem,
} from "./android-tools";

async function openWithScrcpy(item: EmulatorItem) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: item.serial ? "Opening scrcpy" : "Starting Android Emulator",
    message: item.name,
  });

  try {
    const tools = await getToolchain();
    let serial = item.serial;

    if (!serial) serial = (await runningAvds(tools.adb)).get(item.name);
    if (!serial) serial = `emulator-${await nextEmulatorPort(tools.adb)}`;

    await mkdir(environment.supportPath, { recursive: true });
    await writeFile(
      emulatorLaunchLogPath,
      `Starting ${item.name} on ${serial}\nLaunch requested at ${new Date().toISOString()}\n`,
      "utf8",
    );
    await spawnDetached(
      "/bin/zsh",
      [
        emulatorLaunchHelperPath,
        tools.emulator,
        tools.adb,
        tools.scrcpy,
        item.name,
        serial,
        emulatorLaunchLogPath,
        item.serial ? "open" : "start",
      ],
      { stdio: "ignore" },
    );

    toast.style = Toast.Style.Success;
    toast.title = item.serial
      ? "Opening scrcpy"
      : "Android Emulator is starting";
    toast.message = `${item.name}. Progress is written to the launch log.`;
    await closeMainWindow();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not open Android Emulator";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function stopEmulator(item: EmulatorItem, reload: () => Promise<void>) {
  if (!item.serial) return;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Stopping Android Emulator",
    message: item.name,
  });

  try {
    const { adb } = await getToolchain();
    await execute(adb, ["-s", item.serial, "emu", "kill"]);
    toast.style = Toast.Style.Success;
    toast.title = "Android Emulator stopped";
    await reload();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not stop Android Emulator";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export default function LaunchEmulator() {
  const [items, setItems] = useState<EmulatorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const tools = await getToolchain();
      const [names, running] = await Promise.all([
        listAvds(tools.emulator),
        runningAvds(tools.adb),
      ]);
      setItems(names.map((name) => ({ name, serial: running.get(name) })));
    } catch (loadError) {
      setItems([]);
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Android virtual devices..."
    >
      {items.length === 0 ? (
        <List.EmptyView
          icon={Icon.Mobile}
          title={
            error
              ? "Could not load Android virtual devices"
              : "No Android virtual devices found"
          }
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={reload}
              />
            </ActionPanel>
          }
        />
      ) : (
        items.map((item) => (
          <List.Item
            key={item.name}
            icon={Icon.Mobile}
            title={item.name}
            subtitle={item.serial}
            accessories={item.serial ? [{ tag: "Running" }] : undefined}
            actions={
              <ActionPanel>
                <Action
                  title={
                    item.serial
                      ? "Open with Scrcpy"
                      : "Start Headlessly with Scrcpy"
                  }
                  icon={Icon.Play}
                  onAction={() => openWithScrcpy(item)}
                />
                {item.serial ? (
                  <Action
                    title="Stop Emulator"
                    icon={Icon.Stop}
                    onAction={() => stopEmulator(item, reload)}
                  />
                ) : null}
                <Action.Open
                  title="Open Launch Log"
                  icon={Icon.Document}
                  target={emulatorLaunchLogPath}
                />
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  onAction={reload}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
