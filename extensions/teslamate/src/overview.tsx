import { Detail, Action, ActionPanel, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { baseApiConfig, baseApiBody } from "./utils/dbQueries";
import { overviewQueryObjects } from "./utils/overviewDbStatements";
import { baseGrafanaUrl } from "./utils/constants";
import { getCarImageSrc } from "./utils/carImages";
import { handleCarInfoObject } from "./utils/carInfoObject";

export default function Overview() {
  // Retrive vehicle overview data
  const {
    isLoading: carInfoIsLoading,
    data: carInfoResponseData,
    revalidate,
  } = useFetch(baseApiConfig.url, {
    method: baseApiConfig.method,
    headers: baseApiConfig.headers,
    body: JSON.stringify(baseApiBody(overviewQueryObjects)),
    keepPreviousData: true,
  });

  if (carInfoIsLoading) return <Detail isLoading={true} />;

  if (!carInfoResponseData) return <Detail markdown="Failed to fetch TeslaMate overview" />;

  // Extract data from response
  const carInfo = handleCarInfoObject(carInfoResponseData);

  const image_url = getCarImageSrc(carInfo.model, carInfo.marketing_name, carInfo.exterior_color);

  const markdown = `
  # ${carInfo.name} TM${carInfo.model} ${carInfo.marketing_name}

  ![](${image_url})
  `;

  return (
    <Detail
      isLoading={carInfoIsLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="State 🌒">
            <Detail.Metadata.TagList.Item text={carInfo.state} color={carInfo.state === "Online" ? "green" : "red"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="State last changed">
            <Detail.Metadata.TagList.Item text={carInfo.state_last_changed} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Battery 🔋">
            <Detail.Metadata.TagList.Item
              text={carInfo.batteryLevel.toString() + "%"}
              color={carInfo.batteryLevel < 33 ? "red" : carInfo.batteryLevel < 66 ? "yellow" : "green"}
            />
            <Detail.Metadata.TagList.Item
              text={"est. range " + Math.floor(carInfo.ratedBatteryRange).toString() + " " + carInfo.lengthUnit}
              color={carInfo.batteryLevel < 33 ? "red" : carInfo.batteryLevel < 66 ? "yellow" : "green"}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Climate 🌡️">
            <Detail.Metadata.TagList.Item
              text={carInfo.climate ? "Climate: On" : "Climate: Off"}
              color={carInfo.climate ? "green" : "red"}
            />
            <Detail.Metadata.TagList.Item text={"Inside " + carInfo.insideTemp + " °" + carInfo.temperatureUnit} />
            <Detail.Metadata.TagList.Item text={"Outside " + carInfo.outsideTemp + " °" + carInfo.temperatureUnit} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Tire Pressure 🛞">
            <Detail.Metadata.TagList.Item text={"FL: " + carInfo.tpmsPressureFL} />
            <Detail.Metadata.TagList.Item text={"FR: " + carInfo.tpmsPressureFR} />
            <Detail.Metadata.TagList.Item text={"RL: " + carInfo.tpmsPressureRL} />
            <Detail.Metadata.TagList.Item text={"RR: " + carInfo.tpmsPressureRR} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Odometer">
            <Detail.Metadata.TagList.Item text={`${carInfo.odometer} ${carInfo.lengthUnit}`} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="SW Version">
            <Detail.Metadata.TagList.Item text={carInfo.sw_version} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="VIN #">
            <Detail.Metadata.TagList.Item text={carInfo.vin} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title="Open Grafana Dashboard">
          <Action.OpenInBrowser title="Open Grafana Dashboard" url={baseGrafanaUrl} icon="../assets/grafana-logo.png" />
          <Action title="Update / Reload" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
