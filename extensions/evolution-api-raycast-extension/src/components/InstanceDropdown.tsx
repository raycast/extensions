import { Form, Icon } from "@raycast/api";
import { Instance } from "../lib/useInstances";

type InstanceDropdownProps = {
  instances: Instance[];
  isLoading: boolean;
  id?: string;
  title?: string;
  placeholder?: string;
  autoFocus?: boolean;
  storeValue?: boolean;
  info?: string;
};

export function InstanceDropdown({
  instances,
  isLoading,
  id = "instanceName",
  title = "Instance",
  placeholder = "Select an instance",
  autoFocus = true,
  storeValue = true,
  info,
}: InstanceDropdownProps) {
  return (
    <Form.Dropdown
      id={id}
      title={title}
      placeholder={placeholder}
      autoFocus={autoFocus}
      storeValue={storeValue}
      info={info}
    >
      {instances.length === 0 && !isLoading ? (
        <Form.Dropdown.Item value="" title="No instances available" icon={Icon.XMarkCircle} />
      ) : null}
      {instances.map((instance) => (
        <Form.Dropdown.Item
          key={instance.id}
          value={instance.name}
          title={instance.name}
          icon={
            instance.connectionStatus === "open"
              ? { source: Icon.CheckCircle, tintColor: "#00FF00" }
              : instance.connectionStatus === "close"
                ? { source: Icon.XMarkCircle, tintColor: "#FF0000" }
                : { source: Icon.Circle, tintColor: "#FFAA00" }
          }
        />
      ))}
    </Form.Dropdown>
  );
}
