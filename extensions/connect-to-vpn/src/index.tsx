import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { exec } from "child_process";
import { FC, useEffect, useState } from "react";

type NetworkService = {
  id: string;
  name: string;
  hardwarePort: string;
  device: string;
  status: NetworkServiceStatus;
};

type NetworkServiceStatus = "connected" | "connecting" | "disconnecting" | "disconnected" | "invalid";

const statusSortOrder = [
  "connected",
  "connecting",
  "disconnecting",
  "disconnected",
  "invalid",
] as const satisfies Readonly<NetworkServiceStatus[]>;

const sortNetworkServices = (services: NetworkService[]): NetworkService[] => {
  const sortedServices = services.sort((a, b) => {
    const statusA = statusSortOrder.indexOf(a.status);
    const statusB = statusSortOrder.indexOf(b.status);

    if (statusA < statusB) {
      return -1;
    } else if (statusA > statusB) {
      return 1;
    } else {
      return 0;
    }
  });

  return sortedServices;
};

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

type NetworkServiceItemProps = {
  service: NetworkService;
  actionName?: string;
  action?: (service: NetworkService) => void;
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [header, setHeader] = useState<string>();
  const [networkServices, setNetworkServices] = useState<Record<string, NetworkService>>({});

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
    // Escape double quotes in Network Service Name
    networkServiceName = networkServiceName.replace(/"/g, '\\"');

    return new Promise((resolve, reject) => {
      exec(`/usr/sbin/networksetup -showpppoestatus "${networkServiceName}"`, (err, stdout) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(stdout.trim() as NetworkServiceStatus);
        }
      });
    });
  };

  const updateNetworkServices = () => {
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
          }, {} as Record<string, NetworkService>);

          setNetworkServices(networkServices);

          setIsLoading(false); // this placed here looks odd but otherwise `no results` flickers before render
        });
      })
      .catch((err) => {
        setError(err);
      });
  };

  const connectToPPPoEService = (service: NetworkService) => {
    // Escape double quotes in Network Service Name
    const networkServiceName = service.name.replace(/"/g, '\\"');

    exec(`/usr/sbin/networksetup -connectpppoeservice "${networkServiceName}"`, (err) => {
      if (err != null) {
        setError(err);
        return;
      }

      setNetworkServices({
        ...networkServices,
        [service.id]: {
          ...service,
          status: "connecting",
        },
      });
    });
  };

  const disconnectFromPPPoEService = (service: NetworkService) => {
    // Escape double quotes in Network Service Name
    const networkServiceName = service.name.replace(/"/g, '\\"');

    exec(`/usr/sbin/networksetup -disconnectpppoeservice "${networkServiceName}"`, (err) => {
      if (err != null) {
        setError(err);
        return;
      }

      setNetworkServices({
        ...networkServices,
        [service.id]: {
          ...service,
          status: "disconnecting",
        },
      });
    });
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined = undefined;
    if (
      !isLoading &&
      (Object.values(networkServices).find((service) => service.status === "connecting") ||
        Object.values(networkServices).find((service) => service.status === "disconnecting"))
    ) {
      intervalId = setInterval(() => {
        updateNetworkServices();
      }, 500);
    }

    return () => (intervalId ? clearInterval(intervalId) : undefined);
  }, [isLoading, networkServices]);

  useEffect(() => {
    updateNetworkServices();
  }, []);

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  const NetworkServiceItem: FC<NetworkServiceItemProps> = ({ service }) => {
    let actionName: string | undefined;
    let action: ((service: NetworkService) => void) | undefined;
    let icon: Icon | undefined;

    switch (service.status) {
      case "disconnected":
        actionName = "Connect";
        action = connectToPPPoEService;
        icon = Icon.Circle;
        break;
      case "connected":
        actionName = "Disconnect";
        action = disconnectFromPPPoEService;
        icon = Icon.Checkmark;
        break;
      case "connecting":
      case "disconnecting":
        icon = Icon.CircleEllipsis;
        break;
      default:
        icon = Icon.XMarkCircle;
        break;
    }

    return (
      <List.Item
        icon={icon}
        title={service.name}
        actions={
          actionName && (
            <ActionPanel>
              <Action title={actionName} onAction={() => action && action(service)} />
            </ActionPanel>
          )
        }
      />
    );
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title={header}>
        {sortNetworkServices(Object.values(networkServices)).map((service) => (
          <NetworkServiceItem key={service.id} service={service} />
        ))}
      </List.Section>
    </List>
  );
}
