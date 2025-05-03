import {
  ActionPanel,
  List,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const CLI_PATH = "/Applications/UTM.app/Contents/MacOS/utmctl";

const execPromise = promisify(exec);

interface VirtualMachine {
  uuid: string;
  status: string;
  name: string;
}

function loadVirtualMachines(stdout: string) {
  return stdout
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((item) => {
      const parts = item.split(" ").filter(Boolean);
      return {
        uuid: parts[0],
        status: parts[1],
        name: parts.slice(2).join(" "),
      };
    });
}

function VirtualMachineList() {
  const [virtualMachines, setVirtualMachines] = useState<VirtualMachine[]>();
  const [reload, setReload] = useState(false);
  useEffect(() => {
    async function fetch() {
      try {
        const { stdout } = await execPromise(`${CLI_PATH} list`);
        const virtualMachines = loadVirtualMachines(stdout);
        setVirtualMachines(virtualMachines);
      } catch (error) {
        showToast(Toast.Style.Failure, "Couldn't find virtual machines.");
        setVirtualMachines([]);
      }
    }
    fetch();
    setReload(false);
  }, [reload]);

  return (
    <List isLoading={virtualMachines === undefined}>
      {virtualMachines?.map((virtualMachine) => {
        const stopped = virtualMachine.status === "stopped";
        const paused = virtualMachine.status === "paused";
        return (
          <List.Item
            title={virtualMachine.name}
            subtitle={virtualMachine.status}
            key={virtualMachine.uuid}
            actions={
              <ActionPanel>
                <Action
                  title={`${stopped ? "Start" : paused ? "Resume" : "Stop"}`}
                  icon={stopped ? Icon.Play : paused ? Icon.Play : Icon.Stop}
                  onAction={async () => {
                    await execPromise(
                      `${CLI_PATH} ${stopped || paused ? "start" : "stop"} ${
                        virtualMachine.uuid
                      }`
                    );
                    showToast(
                      Toast.Style.Success,
                      `${
                        stopped ? "Started" : paused ? "Resumed" : "Stopped"
                      } ${virtualMachine.name} (${virtualMachine.uuid})`
                    );
                    setReload(true);
                  }}
                />
                {!(stopped || paused) && (
                  <Action
                    title="Suspend"
                    icon={Icon.Pause}
                    onAction={async () => {
                      await execPromise(
                        `${CLI_PATH} suspend ${virtualMachine.uuid}`
                      );
                      showToast(
                        Toast.Style.Success,
                        `Suspended ${virtualMachine.name} (${virtualMachine.uuid})`
                      );
                      setReload(true);
                    }}
                  />
                )}
                <Action.CopyToClipboard
                  content={virtualMachine.uuid}
                  title="Copy UUID"
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  return <VirtualMachineList />;
}
