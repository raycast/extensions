import React, { useState } from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Detail } from "@raycast/api";
import { geolocateIp, GeolocationResponse } from "./api-client";

interface FormValues {
  ip: string;
}

export default function GeolocateIp() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const result = await geolocateIp(values.ip);
      push(<ResultView result={result} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="ip" title="IP Address" placeholder="Enter IP address to geolocate" />
    </Form>
  );
}

function ResultView({ result }: { result: GeolocationResponse }) {
  const markdown = `
# IP Geolocation Result

- IP: ${result.ip}
- Country: ${result.country_name} (${result.country_code2}, ${result.country_code3})
- Region: ${result.region_name}
- City: ${result.city_name}
- Postal Code: ${result.postal_code}
- Latitude: ${result.latitude}
- Longitude: ${result.longitude}
- Timezone: ${result.timezone}
  `;

  return <Detail markdown={markdown} />;
}
