import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { fetchMetar, fetchStation } from "./api.js";

import { usePromise } from "@raycast/utils";

interface Preferences {
  defaultAirportCode: string;
}

interface IAirportCode {
  airportCode: string;
}

export default function Command(props: { arguments: IAirportCode }) {
  const { airportCode } = props.arguments;
  const { defaultAirportCode } = getPreferenceValues<Preferences>();
  const icaoCode = /[a-zA-Z]{4}/;

  try {
    // Verify if an airport code is available
    if (!airportCode && !defaultAirportCode) {
      throw new Error("NO_AIRPORT_CODE");
    }

    const currentAirport = airportCode ? airportCode : defaultAirportCode;

    // Verify whether the airport code is syntactically correct
    if (!icaoCode.test(currentAirport)) {
      throw new Error("WRONG_AIRPORT_CODE");
    }

    const { isLoading, data } = usePromise(
      async (currentAirport: string) => {
        const metar = await fetchMetar(currentAirport);
        const station = await fetchStation(currentAirport);

        return { metar, station };
      },
      [currentAirport]
    );

    return (
      <List isLoading={isLoading}>
        {data && (
          <List.Section title={data.station.site}>
            <List.Item title={data.metar.raw_text} />
          </List.Section>
        )}
      </List>
    );
  } catch (e) {
    switch ((e as { message: string }).message) {
      case "NO_AIRPORT_CODE":
        showToast({
          style: Toast.Style.Failure,
          title: "Missing airport code.",
          message: "An airport code is required. You can provide it in the preferences or on the command line.",
        });
        break;
      case "WRONG_AIRPORT_CODE":
        showToast({
          style: Toast.Style.Failure,
          title: "Wrong airport code.",
          message: "The airport code must be a valid ICAO 4-letter code format.",
        });
        break;
    }
  }
}
