import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { sendLocation } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";
import { useInstances } from "./lib/useInstances";
import { InstanceDropdown } from "./components/InstanceDropdown";

type Values = {
  instanceName: string;
  number: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
};

export default function Command() {
  const { isValid, isChecking } = usePreferencesCheck();
  const { instances, isLoading: loadingInstances } = useInstances(isValid);
  const [isLoading, setIsLoading] = useState(false);

  if (isChecking) return <Form isLoading={true} />;
  if (!isValid) return <Form isLoading={false} />;

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    try {
      await sendLocation({
        instanceName: values.instanceName,
        number: values.number,
        name: values.name,
        address: values.address,
        latitude: parseFloat(values.latitude),
        longitude: parseFloat(values.longitude),
      });
      await showToast({ style: Toast.Style.Success, title: "Location sent" });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to send location";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Send Location"
      isLoading={isLoading || loadingInstances}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Airplane} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <InstanceDropdown instances={instances} isLoading={loadingInstances} />
      <Form.TextField id="number" title="Recipient Number" placeholder="e.g. 55999999999" />
      <Form.TextField id="name" title="Location Name" placeholder="e.g. Bora Bora" />
      <Form.TextField id="address" title="Address" placeholder="e.g. French Polynesian" />
      <Form.TextField id="latitude" title="Latitude" placeholder="e.g. -16.505538" />
      <Form.TextField id="longitude" title="Longitude" placeholder="e.g. -151.742277" />
    </Form>
  );
}
