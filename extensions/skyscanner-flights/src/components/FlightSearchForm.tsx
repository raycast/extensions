import { Form } from "@raycast/api";
import { Airport } from "../data/airports";

interface FlightSearchFormProps {
  originAirports: Airport[];
  destinationAirports: Airport[];
  selectedOrigin: string;
  selectedDestination: string;
  departureDate: Date | null;
  returnDate: Date | null;
  adults: string;
  stops: string;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onOriginSearch: (text: string) => void;
  onDestinationSearch: (text: string) => void;
  onDepartureDateChange: (date: Date | null) => void;
  onReturnDateChange: (date: Date | null) => void;
  onAdultsChange: (value: string) => void;
  onStopsChange: (value: string) => void;
}

export default function FlightSearchForm(props: FlightSearchFormProps) {
  return (
    <>
      <Form.Dropdown
        id="origin"
        title="Origin Airport"
        value={props.originAirports.some((a) => a.iata === props.selectedOrigin) ? props.selectedOrigin : ""}
        onChange={props.onOriginChange}
        onSearchTextChange={props.onOriginSearch}
        throttle
      >
        {props.originAirports.length === 0 ? (
          <Form.Dropdown.Item value="" title="Type to search airports..." />
        ) : (
          props.originAirports.map((airport) => {
            const displayName = `${airport.name} (${airport.iata}) - ${airport.city}, ${airport.country}`;
            return <Form.Dropdown.Item key={airport.iata} value={airport.iata} title={displayName} />;
          })
        )}
      </Form.Dropdown>

      <Form.Dropdown
        id="destination"
        title="Destination Airport"
        value={
          props.destinationAirports.some((a) => a.iata === props.selectedDestination) ? props.selectedDestination : ""
        }
        onChange={props.onDestinationChange}
        onSearchTextChange={props.onDestinationSearch}
        throttle
      >
        {props.destinationAirports.length === 0 ? (
          <Form.Dropdown.Item value="" title="Type to search airports..." />
        ) : (
          props.destinationAirports.map((airport) => {
            const displayName = `${airport.name} (${airport.iata}) - ${airport.city}, ${airport.country}`;
            return <Form.Dropdown.Item key={airport.iata} value={airport.iata} title={displayName} />;
          })
        )}
      </Form.Dropdown>

      <Form.DatePicker
        id="departureDate"
        title="Departure Date"
        type={Form.DatePicker.Type.Date}
        value={props.departureDate}
        onChange={props.onDepartureDateChange}
      />

      <Form.DatePicker
        id="returnDate"
        title="Return Date (Optional)"
        type={Form.DatePicker.Type.Date}
        value={props.returnDate}
        onChange={props.onReturnDateChange}
      />

      <Form.TextField
        id="adults"
        title="Number of Adults"
        placeholder="1"
        value={props.adults}
        onChange={props.onAdultsChange}
        info="Number of adult passengers (1-8)"
      />

      <Form.Dropdown
        id="stops"
        title="Stops"
        value={props.stops}
        onChange={props.onStopsChange}
        info="Filter by number of stops"
      >
        <Form.Dropdown.Item value="any" title="Any Number of Stops" />
        <Form.Dropdown.Item value="direct" title="Direct Flights Only" />
        <Form.Dropdown.Item value="multiStop" title="Flights with Stops" />
      </Form.Dropdown>
    </>
  );
}
