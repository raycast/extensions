import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchTrainInfo, formatDelay, formatTime, calculateProgress } from "./api";
import { Station, TrainInfo } from "./types";
import { getTimeUntilArrival, getTimeUntilDeparture } from "./utils";

function getStationIcon(station: Station): Icon {
  if (station.info.passed) {
    return Icon.CheckCircle;
  } else if (station.info.positionStatus === "future") {
    return Icon.Circle;
  } else {
    return Icon.Dot;
  }
}

function getStationColor(station: Station): Color {
  if (station.info.passed) {
    return Color.Green;
  } else if (station.info.positionStatus === "future") {
    return Color.SecondaryText;
  } else {
    return Color.Blue;
  }
}

function getDelayColor(delay: string | null): Color {
  if (!delay) return Color.PrimaryText;

  const match = delay.match(/PT(\d+)M/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    if (minutes > 10) return Color.Red;
    if (minutes > 5) return Color.Orange;
    if (minutes > 0) return Color.Yellow;
  }
  return Color.Green;
}

function JourneyOverviewItem({ trainInfo }: { trainInfo: TrainInfo }) {
  const { trip, status } = trainInfo;

  if (!trip || !status) return null;

  const progress = calculateProgress(trip.actualPosition, trip.totalDistance);
  const progressText = `${progress.toFixed(1)}% complete`;

  const accessories = [
    { text: `${status.speed.toFixed(0)} km/h`, icon: Icon.Gauge },
    { text: status.internet, icon: Icon.Wifi },
    { text: progressText, icon: Icon.BarChart },
  ];

  return (
    <List.Item
      title={`${trip.trainType} ${trip.vzn} to ${trip.stopInfo.finalStationName}`}
      subtitle={`${(trip.actualPosition / 1000).toFixed(1)}km of ${(trip.totalDistance / 1000).toFixed(1)}km`}
      icon={{ source: Icon.Train, tintColor: Color.Blue }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Journey Info"
            content={`${trip.trainType} ${trip.vzn} to ${trip.stopInfo.finalStationName} - ${progressText}`}
          />
        </ActionPanel>
      }
    />
  );
}

function StationItem({ station }: { station: Station }) {
  // Get planned and estimated times separately
  const scheduledArrival = formatTime(station.timetable.scheduledArrivalTime);
  const actualArrival = formatTime(station.timetable.actualArrivalTime);
  const scheduledDeparture = formatTime(station.timetable.scheduledDepartureTime);
  const actualDeparture = formatTime(station.timetable.actualDepartureTime);

  const arrivalDelay = formatDelay(station.timetable.arrivalDelay);
  const departureDelay = formatDelay(station.timetable.departureDelay);

  // Determine which times to show based on station status
  const showArrival = !station.info.passed && scheduledArrival !== "--:--";
  const showDeparture = station.info.passed && scheduledDeparture !== "--:--";

  // Create time display with planned vs estimated, including delay in parentheses
  const getTimeDisplay = () => {
    const delay = showArrival ? arrivalDelay : departureDelay;
    const delayText = delay && delay !== "" ? ` (${delay})` : "";

    if (showArrival) {
      if (actualArrival !== "--:--" && actualArrival !== scheduledArrival) {
        return `${scheduledArrival} → ${actualArrival}${delayText}`;
      }
      return `${scheduledArrival}${delayText}`;
    } else if (showDeparture) {
      if (actualDeparture !== "--:--" && actualDeparture !== scheduledDeparture) {
        return `${scheduledDeparture} → ${actualDeparture}${delayText}`;
      }
      return `${scheduledDeparture}${delayText}`;
    }
    const baseTime = scheduledArrival !== "--:--" ? scheduledArrival : scheduledDeparture;
    return `${baseTime}${delayText}`;
  };

  const timeText = getTimeDisplay();
  const delay = showArrival ? arrivalDelay : departureDelay;
  const hasDelay = delay && delay !== "";

  // Get time until arrival/departure
  const deltaTime = showArrival
    ? getTimeUntilArrival(station.timetable.actualArrivalTime || station.timetable.scheduledArrivalTime)
    : getTimeUntilDeparture(station.timetable.actualDepartureTime || station.timetable.scheduledDepartureTime);

  // Color code the time based on delay status
  const timeColor = hasDelay
    ? getDelayColor(showArrival ? station.timetable.arrivalDelay : station.timetable.departureDelay)
    : Color.PrimaryText;

  const delayReasons = station.delayReasons?.map((r) => r.text).join(", ") || "";

  const accessories = [
    ...(delayReasons
      ? [
          {
            text: delayReasons,
            icon: Icon.ExclamationMark,
            iconColor: Color.Orange,
          },
        ]
      : []),
    {
      text: timeText,
      icon: Icon.Calendar,
      iconColor: timeColor,
    },
    ...(deltaTime
      ? [
          {
            text: deltaTime,
            icon: Icon.Hourglass,
            iconColor: Color.Blue,
          },
        ]
      : []),
  ];

  // Use platform info as subtitle, fallback to empty string
  const subtitle = station.track.actual ? `Platform ${station.track.actual}` : "";

  return (
    <List.Item
      title={station.station.name}
      subtitle={subtitle}
      icon={{ source: getStationIcon(station), tintColor: getStationColor(station) }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Station Info"
            content={`${station.station.name} - ${timeText}${delay ? ` (${delay})` : ""}`}
          />
          {station.station.geocoordinates && (
            <Action.OpenInBrowser
              title="Open in Maps"
              url={`https://www.google.com/maps?q=${station.station.geocoordinates.latitude},${station.station.geocoordinates.longitude}`}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function ErrorItem({ error }: { error: string }) {
  const isNetworkError = error.includes("WIFIonICE") || error.includes("network") || error.includes("connect");

  return (
    <List.Item
      title={isNetworkError ? "Not connected to WIFIonICE" : "Unable to load train information"}
      subtitle={error}
      icon={{ source: isNetworkError ? Icon.WifiDisconnected : Icon.ExclamationMark, tintColor: Color.Red }}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Error" content={error} />
        </ActionPanel>
      }
    />
  );
}

function NotOnTrainItem() {
  return (
    <List.Item
      title="Not on an ICE train"
      subtitle="Connect to WIFIonICE network to view train information"
      icon={{ source: Icon.Wifi, tintColor: Color.Orange }}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Network Name" content="WIFIonICE" />
        </ActionPanel>
      }
    />
  );
}

function TrainDetailItem({
  label,
  value,
  icon,
  mapUrl,
}: {
  label: string;
  value: string;
  icon: Icon;
  mapUrl?: string;
}) {
  return (
    <List.Item
      title={label}
      accessories={[{ text: value }]}
      icon={{ source: icon, tintColor: Color.SecondaryText }}
      actions={
        <ActionPanel>
          {mapUrl && <Action.OpenInBrowser title="Open in Maps" url={mapUrl} />}
          <Action.CopyToClipboard title={`Copy ${label}`} content={`${label}: ${value}`} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { data: trainInfo, isLoading, revalidate } = usePromise(fetchTrainInfo, []);

  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(30);

  useEffect(() => {
    if (trainInfo && !isLoading) {
      setLastRefreshTime(new Date());
      setCountdown(30);
    }
  }, [trainInfo, isLoading]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (lastRefreshTime) {
        const now = new Date();
        const secondsSinceRefresh = Math.floor((now.getTime() - lastRefreshTime.getTime()) / 1000);
        const remainingSeconds = Math.max(0, 30 - secondsSinceRefresh);
        setCountdown(remainingSeconds);

        // Trigger refresh when countdown reaches 0
        if (remainingSeconds === 0 && countdown > 0) {
          revalidate();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastRefreshTime, countdown, revalidate]);

  return (
    <List navigationTitle="Bahn Info" isLoading={isLoading}>
      {trainInfo?.error && <ErrorItem error={trainInfo.error} />}

      {trainInfo && !trainInfo.error && !trainInfo.isOnTrain && <NotOnTrainItem />}

      {trainInfo?.trip && trainInfo?.status && (
        <>
          <JourneyOverviewItem trainInfo={trainInfo} />

          {/* Upcoming Stations */}
          {trainInfo.trip.stops.filter((station) => !station.info.passed).length > 0 && (
            <List.Section title="Upcoming Stations">
              {trainInfo.trip.stops
                .filter((station) => !station.info.passed)
                .map((station) => (
                  <StationItem key={station.station.evaNr} station={station} />
                ))}
            </List.Section>
          )}

          {/* Passed Stations */}
          {trainInfo.trip.stops.filter((station) => station.info.passed).length > 0 && (
            <List.Section title="Passed Stations">
              {trainInfo.trip.stops
                .filter((station) => station.info.passed)
                .map((station) => (
                  <StationItem key={station.station.evaNr} station={station} />
                ))}
            </List.Section>
          )}

          {/* Train Details */}
          <List.Section title="Train Details">
            <TrainDetailItem
              label="Train Series"
              value={trainInfo.status.series ? `ICE ${trainInfo.status.series}` : trainInfo.trip.trainType}
              icon={Icon.Train}
            />
            <TrainDetailItem
              label="Train ID"
              value={trainInfo.status.tzn || `${trainInfo.trip.trainType} ${trainInfo.trip.vzn}`}
              icon={Icon.Hashtag}
            />
            <TrainDetailItem label="Wagon Class" value={trainInfo.status.wagonClass} icon={Icon.Person} />
            <TrainDetailItem
              label="Current Speed"
              value={`${trainInfo.status.speed.toFixed(0)} km/h`}
              icon={Icon.Gauge}
            />
            <TrainDetailItem
              label="Internet Status"
              value={`${trainInfo.status.internet} → ${trainInfo.status.connectivity?.nextState || "Unknown"}`}
              icon={Icon.Network}
            />
            {trainInfo.status.connectivity?.remainingTimeSeconds && (
              <TrainDetailItem
                label="Connection Changes In"
                value={`${Math.round(trainInfo.status.connectivity.remainingTimeSeconds / 60)} minutes`}
                icon={Icon.Clock}
              />
            )}
            <TrainDetailItem
              label="GPS Location"
              value={`${trainInfo.status.latitude.toFixed(6)}, ${trainInfo.status.longitude.toFixed(6)}`}
              icon={Icon.Globe}
              mapUrl={`https://www.google.com/maps?q=${trainInfo.status.latitude},${trainInfo.status.longitude}`}
            />
            <TrainDetailItem label="GPS Status" value={trainInfo.status.gpsStatus} icon={Icon.Compass} />
          </List.Section>
        </>
      )}

      {trainInfo && (
        <List.Section title="Actions">
          <List.Item
            title="Refresh"
            subtitle={
              lastRefreshTime
                ? `Last refreshed: ${lastRefreshTime.toLocaleTimeString()} • Refreshes in: ${countdown}s`
                : "Update train information"
            }
            icon={{ source: Icon.ArrowClockwise, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action title="Refresh" onAction={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
