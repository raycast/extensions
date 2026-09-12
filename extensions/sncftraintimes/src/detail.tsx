import React from "react";
import { Action, ActionPanel, Color, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { simplifiedJourneys, SimplifiedJourney } from "sncf-api-wrapper";
import { Journey, Preferences } from "./types";
import { useEffect, useState } from "react";
import { dateToReadableDate } from "./utils/datetime";

type DetailProps = {
  journey: Journey;
};

export default function Detail(props: DetailProps) {
  const { journey } = props;
  const [journeys, setJourneys] = useState<SimplifiedJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (!journey) {
      return;
    }

    simplifiedJourneys(preferences.sncfApiKey, {
      from: journey.departure.code,
      to: journey.arrival.code,
      count: 5,
      data_freshness: "realtime",
    })
      .then((response) => {
        setJourneys(response);
        setLoading(false);
      })
      .catch((e) => {
        console.log(e);
        showToast({
          title: "Error while searching for journeys",
          style: Toast.Style.Failure,
        });
      });
  }, [journey]);

  if (!journey) {
    return (
      <List>
        <List.EmptyView title="No journey selected" />
      </List>
    );
  }

  return (
    <List isShowingDetail={isShowingDetail} isLoading={loading}>
      {journeys.map((journey, index) => {
        const isDelayed = journey?.status === "SIGNIFICANT_DELAYS";
        return (
          <List.Item
            key={index}
            title={`${dateToReadableDate(journey.departureTime)} - ${dateToReadableDate(journey.arrivalTime)}`}
            subtitle={journey.duration}
            accessories={[
              { tag: { value: isDelayed ? "Delayed" : "In time", color: isDelayed ? Color.Red : Color.Green } },
            ]}
            detail={<List.Item.Detail markdown={getDetailMarkdown(journey)} metadata={getDetailMetadata(journey)} />}
            actions={
              <ActionPanel title="Actions">
                <Action title="Show Detail" onAction={() => setIsShowingDetail(true)} />
                <Action title="Hide Detail" onAction={() => setIsShowingDetail(false)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function getDetailMarkdown(journey: SimplifiedJourney): string {
  return `
  | Departure | Arrival | Duration |
  | --- | --- | --- |
  | ${dateToReadableDate(journey.departureTime)} | ${dateToReadableDate(journey.arrivalTime)} | ${journey.duration} |
  `;
}

function getDetailMetadata(journey: SimplifiedJourney): React.ReactNode {
  const hasMultipleSections = journey.sections.length > 1;
  return (
    <List.Item.Detail.Metadata>
      {journey.sections.map((section, index) => {
        const readableDepartureTime = dateToReadableDate(section.departureTime);
        const readableArrivalTime = dateToReadableDate(section.arrivalTime);
        const readableBaseDepartureTime = section.baseDepartureTime
          ? dateToReadableDate(section.baseDepartureTime)
          : null;
        const readableBaseArrivalTime = section.baseArrivalTime ? dateToReadableDate(section.baseArrivalTime) : null;

        const hasDisruptions =
          readableBaseDepartureTime &&
          readableBaseArrivalTime &&
          (readableDepartureTime !== readableBaseDepartureTime || readableArrivalTime !== readableBaseArrivalTime);

        return (
          <React.Fragment key={index}>
            <List.Item.Detail.Metadata.TagList
              title={hasMultipleSections ? `${section.from} -> ${section.to}` : "Detail"}
            >
              <List.Item.Detail.Metadata.TagList.Item
                text={hasDisruptions ? "Delayed" : "In time"}
                color={hasDisruptions ? "#ff0000" : "#00ff00"}
              />
            </List.Item.Detail.Metadata.TagList>
            {hasDisruptions && (
              <React.Fragment>
                <List.Item.Detail.Metadata.Label title="Initial departure time" text={readableBaseDepartureTime} />
                <List.Item.Detail.Metadata.Label title="Initial arrival time" text={readableBaseArrivalTime} />
                <List.Item.Detail.Metadata.Label title="Delay" text={section.delay} />
                {section.disruptions.map((disruption, index) => (
                  <List.Item.Detail.Metadata.Label
                    key={index}
                    title="Reason"
                    text={disruption.messages?.join(",") ?? "?"}
                  />
                ))}
              </React.Fragment>
            )}
            <List.Item.Detail.Metadata.Label title="Departure" text={readableDepartureTime} />
            <List.Item.Detail.Metadata.Label title="Arrival" text={readableArrivalTime} />
            <List.Item.Detail.Metadata.Separator />
          </React.Fragment>
        );
      })}
    </List.Item.Detail.Metadata>
  );
}
