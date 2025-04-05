import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { runLightproxyCommand, getServiceTypes } from "./utils";

interface FormValues {
  hostname: string;
  destination: string;
  type: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  async function fetchServiceTypes() {
    try {
      setIsLoading(true);
      const types = await getServiceTypes();
      setServiceTypes(types);
    } catch (error) {
      console.error("Error fetching service types:", error);
      // Fallback to default types
      setServiceTypes(["", "node", "flask", "redis", "postgres", "mysql", "mongo", "docker", "web", "api", "other"]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    try {
      setIsLoading(true);

      const { hostname, destination, type } = values;

      if (!hostname) {
        throw new Error("Hostname is required");
      }

      if (!destination) {
        throw new Error("Destination is required");
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Adding Mapping",
        message: `${hostname} → ${destination}`,
      });

      const args = ["add", hostname, destination];
      if (type) {
        args.push("--type", type);
      }

      await runLightproxyCommand(args);

      await showToast({
        style: Toast.Style.Success,
        title: "Mapping Added",
        message: `${hostname} → ${destination}`,
      });
    } catch (error) {
      console.error("Error adding mapping:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Mapping",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Create dropdown items from discovered service types
  const serviceTypeItems = serviceTypes.map((type) => (
    <Form.Dropdown.Item
      key={type}
      value={type}
      title={type === "" ? "Auto-detect" : type.charAt(0).toUpperCase() + type.slice(1)}
    />
  ));

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Mapping" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="hostname"
        title="Hostname"
        placeholder="e.g., api.test, myapp.dev"
        info="The hostname to map (without http/https)"
        autoFocus
      />
      <Form.TextField
        id="destination"
        title="Destination"
        placeholder="e.g., localhost:3000, 127.0.0.1:8080"
        info="The destination address (IP:port or hostname:port)"
      />
      <Form.Dropdown id="type" title="Service Type">
        {serviceTypeItems}
      </Form.Dropdown>
    </Form>
  );
}
