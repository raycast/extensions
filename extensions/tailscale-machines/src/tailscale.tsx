import React, { useState, useEffect } from "react";
import { ActionPanel, List, Action, showToast, ToastStyle, LocalStorage } from "@raycast/api";
import { execSync } from "child_process";
import net from "net";
import { logger } from "./logger"; // Import the logger

interface Machine {
  name: string;
  ipv4: string;
  title: string;
  subtitle: string;
  action: string;
  actionArgument: string;
  icon: string;
  usageCount: number;
}

const LOCAL_STORAGE_KEY = "lastUsedMachines";
const TIMEOUT = 600; // Increased timeout to 300 milliseconds

export default function Command() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    const savedMachines = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY);
    if (savedMachines) {
      setMachines(JSON.parse(savedMachines));
    }
    setIsLoading(false);

    // Refresh machines in the background
    fetchMachines();
  };

  const fetchMachines = async () => {
    try {
      logger.debug("Starting fetchMachines");

      const tailscalePath = "/Applications/Tailscale.app/Contents/MacOS/Tailscale";
      try {
        execSync(`[ -f "${tailscalePath}" ]`);
        logger.debug("Tailscale app found at:", tailscalePath);
      } catch {
        showToast(ToastStyle.Failure, "Error", "Please install the Tailscale app");
        return;
      }

      const machineTsIp = execSync(`${tailscalePath} ip --4`).toString().trim();
      logger.debug("machineTsIp:", machineTsIp);

      const tailscaleMachinesOutput = execSync(
        `${tailscalePath} status | grep "100." | grep -v "${machineTsIp}" | grep -v "offline" | awk '{print $2, $1}'`,
      )
        .toString()
        .trim()
        .split("\n");

      const savedMachines = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY);
      const savedMachinesMap = savedMachines ? JSON.parse(savedMachines) : {};

      const tailscaleMachines = await Promise.all(
        tailscaleMachinesOutput.map(async (line) => {
          const [name, ipv4] = line.split(" ");
          return {
            name,
            ipv4,
            title: name,
            subtitle: ipv4,
            action: "",
            actionArgument: "",
            icon: "tailscale_icon.png",
            usageCount: savedMachinesMap[name]?.usageCount || 0,
          };
        }),
      );

      logger.debug("tailscaleMachines:", tailscaleMachines);

      setMachines(tailscaleMachines);
      logger.debug("Machines set:", tailscaleMachines);

      // Save machines to LocalStorage
      await LocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tailscaleMachines));
    } catch (error) {
      logger.error("Error in fetchMachines:", error);
      showToast(ToastStyle.Failure, "Error", "Failed to fetch machines");
    } finally {
      setIsLoading(false);
    }
  };

  const incrementUsageCount = async (machine: Machine) => {
    machine.usageCount += 1;
    const updatedMachines = machines.map((m) => (m.name === machine.name ? machine : m));
    setMachines(updatedMachines);
    await LocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedMachines));
  };

  const checkPort = (host: string, port: number, timeout: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });
  };

  const getConnectionOptions = async (machine: Machine) => {
    const options: Machine[] = [];
    logger.debug("Checking ports for machine:", machine.name);

    const portChecks = [
      checkPort(machine.ipv4, 5900, TIMEOUT).then((isOpen) => {
        if (isOpen) {
          options.push({
            ...machine,
            title: `${machine.name} - VNC`,
            action: "open",
            actionArgument: `vnc://${machine.ipv4}`,
            icon: "vnc_icon.png",
          });
          logger.debug("VNC port open for machine:", machine.name);
        } else {
          logger.debug("VNC port closed for machine:", machine.name);
        }
      }),
      checkPort(machine.ipv4, 3389, TIMEOUT).then((isOpen) => {
        if (isOpen) {
          options.push({
            ...machine,
            title: `${machine.name} - RDP`,
            action: "open",
            actionArgument: `rdp://${machine.ipv4}`,
            icon: "rdp_icon.png",
          });
          logger.debug("RDP port open for machine:", machine.name);
        } else {
          logger.debug("RDP port closed for machine:", machine.name);
        }
      }),
      checkPort(machine.ipv4, 22, TIMEOUT).then((isOpen) => {
        if (isOpen) {
          options.push({
            ...machine,
            title: `${machine.name} - SSH`,
            action: "open",
            actionArgument: `ssh://${machine.ipv4}`,
            icon: "ssh_icon.png",
          });
          logger.debug("SSH port open for machine:", machine.name);
        } else {
          logger.debug("SSH port closed for machine:", machine.name);
        }
      }),
    ];

    await Promise.all(portChecks);

    if (options.length === 0) {
      options.push({
        ...machine,
        title: "Machine is online, but not reachable via VNC, RDP, or SSH 😞",
        icon: "tailscale_icon.png",
      });
    }

    return options;
  };

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchQuery} searchBarPlaceholder="Search machines...">
      {machines
        .sort((a, b) => b.usageCount - a.usageCount) // Sort by usageCount
        .filter((machine) => machine.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((machine, index) => (
          <List.Item
            key={index}
            title={machine.name}
            icon="tailscale_icon.png"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Connection Options"
                  target={
                    <ConnectionOptions
                      machine={machine}
                      getConnectionOptions={getConnectionOptions}
                      onMachineUsed={() => incrementUsageCount(machine)} // Increment usageCount
                    />
                  }
                />
                <Action.CopyToClipboard content={machine.name} title="Copy Machine to Clipboard" />
                <Action.CopyToClipboard
                  content={machine.name}
                  title="Copy Machine Name"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
                <Action.CopyToClipboard
                  content={machine.ipv4}
                  title="Copy Machine Ipv4 Address"
                  shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function ConnectionOptions({
  machine,
  getConnectionOptions,
  onMachineUsed,
}: {
  machine: Machine;
  getConnectionOptions: (machine: Machine) => Promise<Machine[]>;
  onMachineUsed: () => void;
}) {
  const [options, setOptions] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      const connectionOptions = await getConnectionOptions(machine);
      setOptions(connectionOptions);
      setIsLoading(false);
    };

    fetchOptions();
  }, [machine, getConnectionOptions]);

  return (
    <List isLoading={isLoading}>
      {options.map((option, index) => (
        <List.Item
          key={index}
          title={option.title}
          icon={option.icon}
          actions={
            <ActionPanel>
              {option.actionArgument ? (
                <Action.OpenInBrowser url={option.actionArgument} onOpen={onMachineUsed} />
              ) : null}
              <Action.CopyToClipboard content={option.actionArgument || machine.name} title="Copy to Clipboard" />
              <Action.CopyToClipboard
                content={machine.name}
                title="Copy Machine Name to Clipboard"
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action.CopyToClipboard
                content={machine.ipv4}
                title="Copy Machine Ipv4 Address"
                shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
