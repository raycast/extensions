import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { runLightproxyCommand, discoverServices, DiscoveredService } from "./utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<DiscoveredService[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    try {
      setIsLoading(true);
      const result = await discoverServices();
      setServices(result);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddService(service: DiscoveredService) {
    try {
      setIsLoading(true);

      await showToast({
        style: Toast.Style.Animated,
        title: "Adding Service",
        message: `${service.name} (${service.address})`,
      });

      await runLightproxyCommand(["add", service.name, service.address, "--type", service.type]);

      await showToast({
        style: Toast.Style.Success,
        title: "Service Added",
        message: service.name,
      });

      // Mark as added
      setServices(
        services.map((s) => (s.name === service.name && s.address === service.address ? { ...s, added: true } : s)),
      );
    } catch (error) {
      console.error("Error adding service:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Service",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddAll() {
    try {
      setIsLoading(true);

      await showToast({
        style: Toast.Style.Animated,
        title: "Adding All Services",
        message: "This may take a moment...",
      });

      await runLightproxyCommand(["discover", "--add"]);

      await showToast({
        style: Toast.Style.Success,
        title: "All Services Added",
      });

      // Refresh the list
      await fetchServices();
    } catch (error) {
      console.error("Error adding all services:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Services",
        message: (error as Error).message,
      });

      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search discovered services..."
      filtering={true}
      throttle={true}
      actions={
        <ActionPanel>
          <Action title="Add All Services" icon={Icon.Plus} onAction={handleAddAll} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchServices} />
        </ActionPanel>
      }
    >
      {error ? (
        <List.Item title="Error" subtitle={error} icon={{ source: Icon.Warning, tintColor: Color.Red }} />
      ) : (
        <List.Section title={`Discovered Services (${services.length})`}>
          {services.map((service, index) => (
            <List.Item
              key={`${service.name}-${service.address}-${index}`}
              title={service.name}
              subtitle={service.address}
              accessories={[
                { text: service.type },
                { text: service.added ? "Added" : "Not Added", icon: service.added ? Icon.CheckCircle : Icon.Circle },
              ]}
              icon={{
                source: service.added ? Icon.CheckCircle : Icon.Plus,
                tintColor: service.added ? Color.Green : Color.Blue,
              }}
              actions={
                <ActionPanel>
                  {!service.added && (
                    <Action title="Add Service" icon={Icon.Plus} onAction={() => handleAddService(service)} />
                  )}
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchServices} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
