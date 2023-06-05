import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { places } from "sncf-api-wrapper";
import { Preferences, STORAGE_JOURNEYS_KEY, StopPoint, Storage, DefaultSNCFApiResponse } from "./types";
import useDebounce from "./hooks/useDebounce";
import PreferencesView from "./preferences";
import { useFetch } from "@raycast/utils";

function formatPlace(place: StopPoint) {
  return `${place.name} & ${place.code}`;
}

export default function Add() {
  const { push } = useNavigation();

  const [departure, setDeparture] = useState<string>("");
  const [arrival, setArrival] = useState<string>("");

  const [draftDeparture, setDraftDeparture] = useState<string>("");
  const [draftArrival, setDraftArrival] = useState<string>("");

  const debounceDeparture = useDebounce<string>(draftDeparture, 300);
  const debounceArrival = useDebounce<string>(draftArrival, 300);

  const [departureError, setDepartureError] = useState<string>("");
  const [arrivalError, setArrivalError] = useState<string>("");

  const [departures, setDepartures] = useState<StopPoint[]>([]);
  const [arrivals, setArrivals] = useState<StopPoint[]>([]);

  const preferences = getPreferenceValues<Preferences>();

  const { data } = useFetch("https://api.sncf.com/v1/coverage/sncf/", {
    headers: {
      Authorization: preferences.sncfApiKey,
    },
  });

  const getPlaces = (value: string, type: "departure" | "arrival") => {
    places(preferences.sncfApiKey, {
      q: value,
      "type[]": "stop_area",
      disable_geojson: true,
    })
      .then((response) => {
        if (!response) return;
        if (type === "departure") {
          setDepartures(
            response.map((place) => ({
              name: place.name,
              code: place.stop_area?.id || "",
            }))
          );
        } else {
          setArrivals(
            response.map((place) => ({
              name: place.name,
              code: place.stop_area?.id || "",
            }))
          );
        }
      })
      .catch(() => {
        showToast({
          title: "Error while searching for places",
          style: Toast.Style.Failure,
        });
      });
  };

  useEffect(() => {
    if (debounceDeparture) {
      getPlaces(debounceDeparture, "departure");
      setDepartureError("");
    }
  }, [debounceDeparture]);

  useEffect(() => {
    if (debounceArrival) {
      getPlaces(debounceArrival, "arrival");
      setArrivalError("");
    }
  }, [debounceArrival]);

  useEffect(() => {
    if ((data as DefaultSNCFApiResponse)?.message || !(data as DefaultSNCFApiResponse)?.regions) {
      push(<PreferencesView />);
    }
  }, [data]);

  const onSubmit = async () => {
    if (!departure) {
      setDepartureError("Please fill in the departure");
      return;
    }

    if (!arrival) {
      setArrivalError("Please fill in the arrival");
      return;
    }

    const storedJourneys = (await LocalStorage.getItem<string>(STORAGE_JOURNEYS_KEY)) || "[]";

    try {
      const journeys = JSON.parse(storedJourneys) as Storage["journeys"];

      const newJourneys = journeys.concat({
        departure: {
          name: departure.split(" & ")[0],
          code: departure.split(" & ")[1],
        },
        arrival: {
          name: arrival.split(" & ")[0],
          code: arrival.split(" & ")[1],
        },
      });
      await LocalStorage.setItem(STORAGE_JOURNEYS_KEY, JSON.stringify(newJourneys));

      showToast({
        title: "Added to journeys",
        style: Toast.Style.Success,
      });
    } catch (e) {
      showToast({
        title: "Error while adding the journey",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Journey" onSubmit={onSubmit} icon={Icon.CheckCircle} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="departure"
        title="Departure"
        error={departureError}
        onChange={setDeparture}
        value={departure}
        onSearchTextChange={setDraftDeparture}
      >
        {departures.map((stopPoint) => (
          <Form.Dropdown.Item key={stopPoint.code} title={stopPoint.name} value={formatPlace(stopPoint)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="arrival"
        title="Arrival"
        error={arrivalError}
        onChange={setArrival}
        value={arrival}
        onSearchTextChange={setDraftArrival}
      >
        {arrivals.map((stopPoint) => (
          <Form.Dropdown.Item key={stopPoint.code} title={stopPoint.name} value={formatPlace(stopPoint)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
