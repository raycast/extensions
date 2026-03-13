import { Form, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

interface Preferences {
  ipGeolocationApiKey: string;
}

interface CommandForm {
  ipAddress: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [output, setOutput] = useState({} as any);
  const [url, setUrl] = useState("");
  const [ipAddressError, setIpAddressError] = useState<string | undefined>();

  function dropIpAddressErrorIfNeeded() {
    if (ipAddressError && ipAddressError.length > 0) {
      setIpAddressError(undefined);
    }
  }

  async function handleSubmit(values: CommandForm) {
    if (values.ipAddress == "") {
      setIpAddressError("This field is required!");
      return;
    } else if (
      !/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        values.ipAddress
      )
    ) {
      setIpAddressError("Invalid IP address!");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Retrieving geolocation...",
    });

    const baseUrl = "https://ipgeolocation.abstractapi.com/v1";
    const url = `${baseUrl}/?api_key=${encodeURIComponent(preferences.ipGeolocationApiKey)}`;

    await axios
      .get(url)
      .then((response) => {
        toast.style = Toast.Style.Success;
        toast.title = "Geolocation retrieved successfully";

        setUrl(url);
        setOutput(response.data);
      })
      .catch((error) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Unable to retrieve geolocation";
        toast.message = error.response.data.error.message ?? "";
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Geolocate" onSubmit={handleSubmit} icon={Icon.Pencil} />
          {url ? (
            <>
              <Action.OpenInBrowser title="Open in Browser" url={url} />
              <Action.CopyToClipboard title="Copy to Clipboard" content={url} />
            </>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ipAddress"
        title="IP Address"
        placeholder="Enter IP address"
        error={ipAddressError}
        onChange={dropIpAddressErrorIfNeeded}
      />
      {output.ip_address ? (
        <>
          <Form.Separator />
          <Form.Description title="Details" text="" />
          <Form.Description title="IP Address" text={output.ip_address || "-"} />
          <Form.Description title="City" text={output.city || "-"} />
          <Form.Description title="City Geoname ID" text={`${output.city_geoname_id || "-"}`} />
          <Form.Description title="Region" text={output.region || "-"} />
          <Form.Description title="Region ISO Code" text={output.region_iso_code || "-"} />
          <Form.Description title="Region Geoname ID" text={`${output.region_geoname_id || "-"}`} />
          <Form.Description title="Postal Code" text={output.postal_code || "-"} />
          <Form.Description title="Country" text={output.country || "-"} />
          <Form.Description title="Country Code" text={output.country_code || "-"} />
          <Form.Description title="Country Geoname ID" text={`${output.country_geoname_id || "-"}`} />
          <Form.Description title="Country Is Eu" text={output.country_is_eu ? "Yes" : "No"} />
          <Form.Description title="Continent" text={output.continent || "-"} />
          <Form.Description title="Continent Code" text={output.continent_code || "-"} />
          <Form.Description title="Continent Geoname ID" text={`${output.continent_geoname_id || "-"}`} />
          <Form.Description title="Longitude" text={`${output.longitude || "-"}`} />
          <Form.Description title="Latitude" text={`${output.latitude || "-"}`} />
          <Form.Description title="" text="" />
          {output.security ? (
            <>
              <Form.Separator />
              <Form.Description title="Security" text="" />
              <Form.Description title="Is VPN" text={output.security.is_vpn ? "Yes" : "No"} />
              <Form.Description title="" text="" />
            </>
          ) : null}
          {output.timezone ? (
            <>
              <Form.Separator />
              <Form.Description title="Timezone" text="" />
              <Form.Description title="Name" text={output.timezone.name || "-"} />
              <Form.Description title="Abbreviation" text={output.timezone.abbreviation || "-"} />
              <Form.Description title="GMT Offset" text={output.timezone.gmt_offset || "-"} />
              <Form.Description title="Current Time" text={output.timezone.current_time || "-"} />
              <Form.Description title="Is DST" text={output.timezone.is_dst || "-"} />
              <Form.Description title="" text="" />
            </>
          ) : null}
          {output.currency ? (
            <>
              <Form.Separator />
              <Form.Description title="Currency" text="" />
              <Form.Description title="Currency Name" text={output.currency.currency_name || "-"} />
              <Form.Description title="Currency Code" text={output.currency.currency_code || "-"} />
              <Form.Description title="" text="" />
            </>
          ) : null}
          {output.connection ? (
            <>
              <Form.Separator />
              <Form.Description title="Connection" text="" />
              <Form.Description
                title="Autonomous System Number"
                text={output.connection.autonomous_system_number || "-"}
              />
              <Form.Description
                title="Autonomous System Organization"
                text={output.connection.autonomous_system_organization || "-"}
              />
              <Form.Description title="Connection Type" text={output.connection.connection_type || "-"} />
              <Form.Description title="ISP Name" text={output.connection.isp_name || "-"} />
              <Form.Description title="Organization Name" text={output.connection.organization_name || "-"} />
            </>
          ) : null}
        </>
      ) : null}
    </Form>
  );
}
