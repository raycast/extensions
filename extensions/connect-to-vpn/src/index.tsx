import { List, showToast, Toast, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [header, setHeader] = useState<string>();
  const [networkServices, setNetworkServices] = useState<NetworkServices>({});

  const parseServices = (text: string) => {
    const regex = /\((\d+)\)\s+(.*?)\s+\(Hardware Port: (.*?), Device: (.*?)\)/g;
    const matches = Array.from(text.matchAll(regex));

    return matches.map((item) => {
      return {
        id: item[1],
        name: item[2],
        hardwarePort: item[3],
        device: item[4],
        status: "disconnected",
      } as NetworkService;
    });
  };

  const connectToPPPoEService = (service: NetworkService) => {
    exec(`/usr/sbin/networksetup -connectpppoeservice '${service.name}'`, (err, _) => {
      if (err != null) {
        setError(err);
        return;
      }

      setNetworkServices({
        ...networkServices,
        [service.id]: {
          ...service,
          status: "connected",
        },
      });
    });
  };

  const disconnectFromPPPoEService = (service: NetworkService) => {
    exec(`/usr/sbin/networksetup -disconnectpppoeservice '${service.name}'`, (err, _) => {
      if (err != null) {
        setError(err);
        return;
      }

      setNetworkServices({
        ...networkServices,
        [service.id]: {
          ...service,
          status: "disconnected",
        },
      });
    });
  };

  const listNetworkServiceOrder = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      exec("/usr/sbin/networksetup -listnetworkserviceorder", (err, stdout) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  };

  const showPPPoEStatus = (networkServiceName: string): Promise<NetworkServiceStatus> => {
    return new Promise((resolve, reject) => {
      exec(`/usr/sbin/networksetup -showpppoestatus '${networkServiceName}'`, (err, stdout) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(stdout.trim() as NetworkServiceStatus);
        }
      });
    });
  };

  useEffect(() => {
    listNetworkServiceOrder()
      .then((stdout) => {
        const denylist = ["Wi-Fi", "Bluetooth PAN", "Thunderbolt Bridge"];

        const [head] = stdout.split("\n");
        setHeader(head);

        const services = parseServices(stdout).filter((service) => !denylist.includes(service.name));

        return services;
      })
      .then((services) => {
        const promises = services.map(async (service) => {
          return showPPPoEStatus(service.name).then((status) => {
            return {
              ...service,
              status: status,
            };
          });
        });

        Promise.all(promises).then((services) => {
          const networkServices = services.reduce((acc, service) => {
            return {
              ...acc,
              [service.id]: service,
            };
          }, {} as NetworkServices);

          setNetworkServices(networkServices);
          setIsLoading(false); // this placed here looks odd but otherwise `no results` flickers before render
        });
      })
      .catch((err) => {
        setError(err);
      });
  }, []);

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title={header}>
        {Object.values(networkServices).map((service) => {
          if (service.status == "connected") {
            return (
              <List.Item
                icon={Icon.Checkmark}
                key={service.id}
                title={service.name}
                actions={
                  <ActionPanel>
                    <Action title="Disconnect" onAction={() => disconnectFromPPPoEService(service)} />
                  </ActionPanel>
                }
              />
            );
          } else if (service.status == "disconnected") {
            return (
              <List.Item
                icon={Icon.Circle}
                key={service.id}
                title={service.name}
                actions={
                  <ActionPanel>
                    <Action title="Connect" onAction={() => connectToPPPoEService(service)} />
                  </ActionPanel>
                }
              />
            );
          } else {
            return <List.Item icon={Icon.XmarkCircle} key={service.id} title={service.name} />;
          }
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
  status: NetworkServiceStatus;
};

type NetworkServices = {
  [id: string]: NetworkService;
};

type NetworkServiceStatus = "connected" | "disconnected";
