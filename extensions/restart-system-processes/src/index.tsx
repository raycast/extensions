import {
  Action,
  ActionPanel,
  confirmAlert,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  List,
  clearSearchBar,
  closeMainWindow,
  useNavigation,
  Alert,
  LocalStorage,
} from "@raycast/api";
import { exec } from "child_process";
import { ReactNode, useEffect, useState } from "react";

interface Preferences {
  useSudo: boolean;
}

type Process = {
  process: string;
  label: string;
  warning?: string;
  icon: Icon;
};

const commonProcesses: Process[] = [
  { label: "Finder", process: "Finder", icon: Icon.Finder },
  { label: "Dock", process: "Dock", icon: Icon.Desktop },
  { label: "Audio", process: "coreaudiod", icon: Icon.Speaker },
  { label: "Bluetooth", process: "bluetoothd", icon: Icon.Bluetooth },
  {
    label: "WindowServer",
    process: "-HUP WindowServer",
    icon: Icon.Window,
    warning: "This will close all open applications and log you out.",
  },
  { label: "SystemUIServer (e.g. Menu Bar)", process: "SystemUIServer", icon: Icon.ComputerChip },
];

async function getOrder(): Promise<string[]> {
  return JSON.parse((await LocalStorage.getItem<string>("order")) || "[]");
}

async function orderItems<T extends (string | Process)[]>(items: T): Promise<T> {
  const order = await getOrder();
  return items.sort((a, b) => {
    let aIndex = order.indexOf(typeof a === "string" ? a : a.process);
    let bIndex = order.indexOf(typeof b === "string" ? b : b.process);
    if (aIndex === -1) aIndex = order.length;
    if (bIndex === -1) bIndex = order.length;
    return aIndex - bIndex;
  });
}

async function saveLastUsedItems(process: string) {
  const order = await getOrder();
  const newOrder = [process, ...order.filter((i) => i !== process)];
  await LocalStorage.setItem("order", JSON.stringify(newOrder));
}

function getAdvancedItems() {
  return new Promise<ReactNode[]>((resolve, reject) => {
    exec("launchctl list | grep com.apple | awk '{print $3}'\n", (error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error); // Reject the promise on error
        return;
      }

      const services = stdout.split("\n").map((line) => line.trim());

      const items = services.map((service) => (
        <List.Item
          key={service}
          title={service}
          actions={
            <ActionPanel>
              <Action
                title="Restart"
                onAction={async () => {
                  await performAction({ advancedMode: service });
                }}
              />
            </ActionPanel>
          }
        />
      ));

      resolve(items); // Resolve the promise with the updated items
    });
  });
}

async function getExePath(exe: string) {
  const path = await new Promise((resolve) => {
    exec(`which ${exe}`, (error, stdout) => {
      resolve(error ? null : stdout.trim());
    });
  });

  if (path) {
    return path;
  }

  // test a few common locations
  const locations = [`/usr/bin/${exe}`, `/bin/${exe}`, `/usr/sbin/${exe}`, `/sbin/${exe}`];
  for (const loc of locations) {
    if (
      await new Promise((resolve) => {
        exec(`type ${loc}`, (error) => {
          resolve(!error);
        });
      })
    ) {
      return loc;
    }
  }

  return null;
}

export default function Command() {
  const { push } = useNavigation();

  const [orderedProcesses, setOrderedProcesses] = useState<Process[]>([]);
  useEffect(() => {
    orderItems(commonProcesses).then(setOrderedProcesses);
  }, []);

  return (
    <List isLoading={orderedProcesses.length === 0}>
      <List.Section title="Common">
        {orderedProcesses.map((process) => (
          <List.Item
            key={process.process}
            title={process.label}
            icon={process.icon}
            actions={
              <ActionPanel>
                <Action
                  title="Restart"
                  onAction={async () => {
                    await performAction({ process });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {/* This condition needs to be here, otherwise focus would always be on Advanced by default */}
      {orderedProcesses.length ? (
        <List.Section title="Advanced">
          <List.Item
            key="advanced"
            title="Advanced Mode..."
            icon={Icon.BulletPoints}
            actions={
              <ActionPanel>
                <Action
                  title="View All Running Services"
                  onAction={async () => {
                    push(<AdvancedList />);
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function AdvancedList() {
  const [items, setItems] = useState<ReactNode[]>([]);

  useEffect(() => {
    getAdvancedItems().then(setItems);
  }, []);

  return <List isLoading={items.length === 0}>{items}</List>;
}

async function performAction(values: { process: Process } | { advancedMode: string }) {
  const sudoOption = getPreferenceValues<Preferences>().useSudo;
  const sudo = sudoOption ? "sudo" : "";
  const processName = "process" in values ? values.process.label : values.advancedMode;
  let cmd = "";

  if (!process) {
    await showToast(Toast.Style.Failure, "No process selected");
    return;
  }

  await clearSearchBar();
  await closeMainWindow();

  if ("process" in values) {
    if (values.process.warning) {
      let userConfirmed = false;
      await confirmAlert({
        title: "Warning",
        message: values.process.warning,
        icon: Icon.Warning,
        primaryAction: {
          title: "Continue",
          style: Alert.ActionStyle.Destructive,
          onAction: () => {
            userConfirmed = true;
          },
        },
      });
      if (!userConfirmed) return;
    }

    const killall = await getExePath("killall");
    if (!killall) {
      await showToast(Toast.Style.Failure, "killall executable not found");
      return;
    }
    cmd = `${sudo} ${killall} -KILL ${values.process.process}`;
  } else {
    const launchctl = await getExePath("launchctl");
    if (!launchctl) {
      await showToast(Toast.Style.Failure, "launchctl executable not found");
      return;
    }
    cmd = `${sudo} ${launchctl} stop ${values.advancedMode}`;
  }

  await saveLastUsedItems("process" in values ? values.process.process : values.advancedMode);

  let success = true;

  const child = exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.log(`exec error: ${error}`);
      showToast(Toast.Style.Failure, `Error: ${error.message}`);
      success = false;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
    }
    if (stdout) {
      console.log(`stdout: ${stdout}`);
    }
  });

  // return only after the process has finished
  await new Promise((resolve) => {
    child.on("exit", resolve);
  });

  await new Promise((resolve) => {
    setTimeout(resolve, 5);
  });

  if (success) {
    await showToast(Toast.Style.Success, `${processName} restarted`);
  }
}
