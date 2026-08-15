import { Detail, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { PackageTrackAPI } from "./api";
import { makeMetaData } from "./components/makemetadata";
import { Accepted, ShippingInfo, TimeMetrics } from "./types";

export default function Command(props: { arguments: { packageNumber: string } }) {
  const { packageNumber } = props.arguments;
  const [trackData, setTrackData] = useState<Accepted[]>([]);

  const tracker = new PackageTrackAPI(packageNumber);
  useEffect(() => {
    async function getParcelData() {
      try {
        const trackData = await tracker.track();
        if (trackData.errors !== undefined) {
          showToast(Toast.Style.Failure, trackData.errors[0].message, "Please insert correct input");
          setTimeout(() => {
            popToRoot({ clearSearchBar: true });
          }, 500);
        } else if (trackData.rejected.length > 0) {
          showToast(Toast.Style.Failure, "Error Tracking", trackData.rejected[0].error.message);
          setTimeout(() => {
            popToRoot({ clearSearchBar: true });
          }, 500);
        } else {
          setTrackData(trackData.accepted);
        }
      } catch (error: unknown) {
        console.log(error);
        showToast(Toast.Style.Failure, "Unknown Error", "If this persists please contact developer.");
        setTimeout(() => {
          popToRoot({ clearSearchBar: true });
        }, 500);
      }
    }
    getParcelData();
  }, []); // only run this effect once when the component mounts

  return (
    <Detail
      isLoading={trackData === undefined}
      navigationTitle={packageNumber}
      markdown={trackData?.map((acceptedPKG: Accepted) => makeStatus(acceptedPKG) + makeEvents(acceptedPKG))[0]}
      metadata={
        trackData?.map((acceptedPKG: Accepted) => {
          return makeMetaData(
            acceptedPKG.track_info.shipping_info as ShippingInfo,
            acceptedPKG.track_info.time_metrics as TimeMetrics,
          );
        })[0]
      }
    />
  );
}

function makeStatus(trackData: Accepted) {
  const latestStatus = trackData.track_info.latest_status;

  const status = `# Status: ${latestStatus.status} \n\n --- \n\n`;
  return status;
}

function makeEvents(trackData: Accepted): string {
  return trackData.track_info.tracking.providers
    .map((provider) => {
      return (
        "## " +
        provider.provider.name +
        "\n\n" +
        provider.events
          .sort((eventA, eventB) => {
            const eventATime = new Date(eventA.time_utc);
            const eventBTime = new Date(eventB.time_utc);
            return eventBTime.getTime() - eventATime.getTime();
          })
          .map((providerEvent) => {
            const eventTime = new Date(providerEvent.time_utc);
            let location = "";
            if (providerEvent.location !== null) {
              location = " - " + providerEvent.location;
            }
            return (
              "### " +
              eventTime.toLocaleDateString() +
              " " +
              eventTime.toLocaleTimeString() +
              location +
              " \n  - [ ] " +
              providerEvent.description
            );
          })
          .join("\n\n")
      );
    })
    .join("\n\n --- \n\n");
}
