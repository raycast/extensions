import { List, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [header, setHeader] = useState<string>();
  const [networkServices, setNetworkServices] = useState<NetworkService[]>([]);

  const parseServices = (text: string) => {
    const regex = /\((\d+)\)\s+(.*?)\s+\(Hardware Port: (.*?), Device: (.*?)\)/g;
    const matches = Array.from(text.matchAll(regex));

    return matches.map((item) => {
      return {
        id: item[1],
        name: item[2],
        hardwarePort: item[3],
        device: item[4],
      } as NetworkService;
    });
  };

  const connectToPPPoEService = (networkServiceName: string) => {
    exec(`/usr/sbin/networksetup -connectpppoeservice '${networkServiceName}'`, (err, _) => {
      if (err != null) {
        setError(err);
        return;
      }
    });
  };

  const disconnectFromPPPoEService = (networkServiceName: string) => {
    exec(`/usr/sbin/networksetup -disconnectpppoeservice '${networkServiceName}'`, (err, _) => {
      if (err != null) {
        setError(err);
        return;
      }
    });
  };

  const fetchNetworkServices = () => {
    exec("/usr/sbin/networksetup -listnetworkserviceorder", (err, stdout) => {
      if (err != null) {
        setError(err);
        setIsLoading(false);
        return;
      }

      const denylist = ["Wi-Fi", "Bluetooth PAN", "Thunderbolt Bridge"];

      const [head] = stdout.split("\n");
      setHeader(head);

      const services = parseServices(stdout);
      setNetworkServices(services.filter((service) => !denylist.includes(service.name)));

      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchNetworkServices();
  }, []);

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title={header}>
        {networkServices.map((service) => {
          return (
            <List.Item
              key={service.id}
              title={service.name}
              actions={
                <ActionPanel>
                  <Action title="Connect" onAction={() => connectToPPPoEService(service.name)} />
                  <Action title="Disconnect" onAction={() => disconnectFromPPPoEService(service.name)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

type NetworkService = {
  id: string;
  name: string;
  hardwarePort: string;
  device: string;
};
