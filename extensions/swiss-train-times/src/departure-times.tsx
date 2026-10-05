import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PlaceResult, StopEventRequest, StopEventResult } from "ojp-sdk-next";
import { ojp } from "./ojp";
import { differenceInMinutes, format } from "date-fns";
import { addPlaceStop } from "./cache";
import { useEffect } from "react";

async function loadDepartures(place: PlaceResult) {
  const ref = place.place.stopPlace?.stopPlaceRef;
  if (!ref) {
    return [];
  }

  return ojp.fetchStopEvents(StopEventRequest.initWithPlaceRefAndDate(ref));
}

export function DepartureTimes({ place }: { place: PlaceResult }) {
  const { data, isLoading } = usePromise(loadDepartures, [place]);

  useEffect(() => {
    addPlaceStop(place);
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Departures">
        {data?.map((ser, index) => <DepartureItem key={index} ser={ser} />)}
      </List.Section>
    </List>
  );
}

export function DepartureItem({ ser }: { ser: StopEventResult }) {
  const service = ser.stopEvent.service;
  const call = ser.stopEvent.thisCall.callAtStop;
  const title = `${service.publishedServiceName.text} => ${service.destinationText?.text}`;
  const quay = call.estimatedQuay?.text ?? call.plannedQuay?.text;

  const planned = parseDate(call.serviceDeparture?.timetabledTime);
  const estimated = parseDate(call.serviceDeparture?.estimatedTime);

  const timeStr = planned ? format(planned, "HH:mm") : "na";
  let subtitle = quay ? `Pl. ${quay} @ ${timeStr}` : timeStr;

  const diff = estimated && planned ? differenceInMinutes(estimated, planned) : 0;

  if (diff > 2) {
    subtitle += ` +${diff}’`;
  }

  return <List.Item title={title} key={service.journeyRef} subtitle={subtitle} />;
}

function parseDate(input?: string) {
  if (!input) return;

  const date = new Date(input);
  if (!isNaN(+date)) {
    return date;
  }
}
