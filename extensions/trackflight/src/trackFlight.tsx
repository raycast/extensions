import { Action, ActionPanel, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import makeArrivalData from "./components/arrival";
import makeDepartureData from "./components/departure";
import makeGeneralData from "./components/general";
import { APIError, DateError, FlightNumberError } from "./customErrors";
import FlightTrack, { relativeDate } from "./flightTrackApi";

export default function TrackFlightExtension(props: { arguments: { flightNumber: string } }) {
  const today = new Date(Date.now());
  const [flightDate, setFlightDate] = useState<relativeDate>("today");

  const [isLoading, setIsLoading] = useState(true);
  const { flightNumber } = props.arguments;
  const flightTrackRef = useRef<FlightTrack>();

  useEffect(() => {
    try {
      flightTrackRef.current = new FlightTrack(flightNumber.toUpperCase(), today);
    } catch (error: unknown) {
      if (error instanceof DateError || error instanceof FlightNumberError) {
        showToast(Toast.Style.Failure, "Some Error in your input!", error.message);
        popToRoot({ clearSearchBar: true });
      } else {
        showToast(Toast.Style.Failure, "Unknown Error", "If this persists please contact developer.");
        setTimeout(() => {
          popToRoot({ clearSearchBar: true });
        }, 500);
      }
    }
    setFlightDate("today");
  }, []); // only run this effect once when the component mounts

  function actionCommands() {
    return (
      <ActionPanel title="Flight Date">
        <Action
          title="Tomorrow"
          onAction={() => {
            setFlightDate("tomorrow");
          }}
        />
        <Action
          title="Yesterday"
          onAction={() => {
            setFlightDate("yesterday");
          }}
        />
        <Action
          title="The Day After Tomorrow"
          onAction={() => {
            setFlightDate("dayAfterTomorrow");
          }}
        />
        <Action
          title="Today"
          onAction={() => {
            setFlightDate("today");
          }}
        />
      </ActionPanel>
    );
  }

  useEffect(() => {
    async function getFlightData() {
      try {
        const flightTrack = flightTrackRef.current;
        if (flightTrack == undefined) {
          return;
        }
        flightTrack.setFlightDate(flightDate);
        flightTrack.response = (await flightTrack.getFlight())[0];
        flightTrackRef.current = flightTrack;
        setIsLoading(false);
      } catch (error: Error | unknown) {
        console.error(error);
        if (error instanceof APIError) {
          showToast(Toast.Style.Failure, "Tracking Error", error.message);
          popToRoot({ clearSearchBar: true });
        } else if (error instanceof DateError || error instanceof FlightNumberError) {
          showToast(Toast.Style.Failure, "Some Error in your input!", error.message);
          popToRoot({ clearSearchBar: true });
        } else {
          showToast(Toast.Style.Failure, "Unknown Error", "If this persists please contact developer.");
          setTimeout(() => {
            popToRoot({ clearSearchBar: true });
          }, 3000);
        }
      }
    }
    getFlightData();
  }, [flightDate]);
  return (
    <List isShowingDetail={true} navigationTitle={flightNumber.toUpperCase()} isLoading={isLoading}>
      <List.Item
        title="General"
        icon={Icon.Airplane}
        actions={actionCommands()}
        detail={makeGeneralData(flightTrackRef.current?.response)}
      />
      <List.Item
        title="Departure"
        icon={Icon.AirplaneTakeoff}
        actions={actionCommands()}
        detail={makeDepartureData(flightTrackRef.current?.response?.departure)}
      />
      <List.Item
        title="Arrival"
        icon={Icon.AirplaneLanding}
        actions={actionCommands()}
        detail={makeArrivalData(flightTrackRef.current?.response?.arrival)}
      />
    </List>
  );
}
