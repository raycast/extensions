import { List, ActionPanel, Action, Icon, Color, Image, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import fetch, { AbortError } from "node-fetch";
import {
  CombinedDriverData,
  OpenF1Session,
  OpenF1Meeting,
  OpenF1Lap,
  OpenF1PitStop,
  OpenF1TeamRadio,
  OpenF1Stint,
  OpenF1CarData,
  OpenF1LocationDataPoint,
  OpenF1PositionDataPoint,
  OpenF1RaceControlMessage,
} from "./current-session";
import { getNationalityFlag } from "./utils";
import DriverLapDetailView from "./DriverLapDetailView";
import DriverPitDetailView from "./DriverPitDetailView";
import DriverStintDetailView from "./DriverStintDetailView";
import DriverLocationDetailView from "./DriverLocationDetailView";
import DriverPositionDetailView from "./DriverPositionDetailView";
import DriverRaceControlDetailView from "./DriverRaceControlDetailView";

const OPENF1_API_BASE_URL = "https://api.openf1.org/v1";

interface DriverDetailViewProps {
  driver: CombinedDriverData;
  sessionInfo: OpenF1Session | null;
  meetingInfo: OpenF1Meeting | null;
  allLaps: OpenF1Lap[];
  allPitStops: OpenF1PitStop[];
  allTeamRadio: OpenF1TeamRadio[];
  allStints: OpenF1Stint[];
  allLocationData: OpenF1LocationDataPoint[];
  allPositionData: OpenF1PositionDataPoint[];
  allRaceControlMessages: OpenF1RaceControlMessage[];
}

// Helper to format lap/sector times (can be moved to utils if used elsewhere)
const formatLapTime = (timeInSeconds: number | null | undefined): string => {
  if (timeInSeconds === null || timeInSeconds === undefined) return "N/A";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
  }
  return `${seconds.toFixed(3)}s`;
};

const getTyreColor = (compound: string | null): Color => {
  switch (compound?.toUpperCase()) {
    case "SOFT":
      return Color.Red;
    case "MEDIUM":
      return Color.Yellow;
    case "HARD":
      return Color.PrimaryText;
    case "INTERMEDIATE":
      return Color.Green;
    case "WET":
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
};

const getDrsStatus = (drsValue: number | null): string => {
  if (drsValue === null) return "N/A";
  // Based on OpenF1 documentation https://openf1.org/
  if ([10, 12, 14].includes(drsValue)) return "Active";
  if (drsValue === 8) return "Eligible";
  if ([0, 1].includes(drsValue)) return "Off";
  return `Unknown (${drsValue})`;
};

export default function DriverDetailView({
  driver,
  sessionInfo,
  meetingInfo,
  allLaps,
  allPitStops,
  allTeamRadio,
  allStints,
  allLocationData,
  allPositionData,
  allRaceControlMessages,
}: DriverDetailViewProps) {
  const [carData, setCarData] = useState<OpenF1CarData[]>([]);
  const [isLoadingCarData, setIsLoadingCarData] = useState<boolean>(true);
  const [carDataError, setCarDataError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionInfo?.session_key || !driver?.driver_number) {
      setIsLoadingCarData(false);
      return;
    }

    const controller = new AbortController();
    const fetchCarData = async () => {
      setIsLoadingCarData(true);
      setCarDataError(null);
      try {
        const response = await fetch(
          `${OPENF1_API_BASE_URL}/car_data?session_key=${sessionInfo.session_key}&driver_number=${driver.driver_number}&date>=${new Date(Date.now() - 5 * 60 * 1000).toISOString()}`, // Fetch last 5 mins of data
          { signal: controller.signal },
        );
        if (!response.ok) {
          if (response.status === 404) throw new Error("No car data found for this driver in this session.");
          throw new Error(`Failed to fetch car data: ${response.statusText}`);
        }
        const data: OpenF1CarData[] = await response.json();
        // Sort by date, newest first
        setCarData(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (err) {
        if (err instanceof AbortError) {
          console.log("Car data fetch aborted");
          return;
        }
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred fetching car data";
        console.error(errorMessage, err);
        setCarDataError(errorMessage);
        showToast({ style: Toast.Style.Failure, title: "Error Fetching Car Data", message: errorMessage });
      } finally {
        setIsLoadingCarData(false);
      }
    };

    fetchCarData();
    const intervalId = setInterval(fetchCarData, 10000); // Refresh car data every 10s, adjust as needed

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [sessionInfo?.session_key, driver?.driver_number]);

  // Filter data for the current driver
  const driverLaps = useMemo(
    () =>
      allLaps
        .filter((lap) => lap.driver_number === driver.driver_number)
        .sort((a, b) => (b.lap_number || 0) - (a.lap_number || 0)),
    [allLaps, driver.driver_number],
  );
  const driverPitStops = useMemo(
    () =>
      allPitStops
        .filter((pit) => pit.driver_number === driver.driver_number)
        .sort((a, b) => (b.lap_number || 0) - (a.lap_number || 0)),
    [allPitStops, driver.driver_number],
  );
  const driverTeamRadio = useMemo(
    () =>
      allTeamRadio
        .filter((radio) => radio.driver_number === driver.driver_number)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allTeamRadio, driver.driver_number],
  );
  const driverStints = useMemo(
    () =>
      allStints
        .filter((stint) => stint.driver_number === driver.driver_number)
        .sort((a, b) => (b.stint_number || 0) - (a.stint_number || 0)),
    [allStints, driver.driver_number],
  );
  const driverLocationData = useMemo(
    () =>
      allLocationData
        .filter((loc) => loc.driver_number === driver.driver_number)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allLocationData, driver.driver_number],
  );
  const driverPositionHistory = useMemo(
    () =>
      allPositionData
        .filter((pos) => pos.driver_number === driver.driver_number)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allPositionData, driver.driver_number],
  );
  const driverRaceControlMessages = useMemo(
    () =>
      allRaceControlMessages
        .filter((rc) => rc.driver_number === driver.driver_number)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allRaceControlMessages, driver.driver_number],
  );

  const latestCarSample = carData.length > 0 ? carData[0] : null;

  return (
    <List
      navigationTitle={`${driver.full_name} (#${driver.driver_number})`}
      isLoading={isLoadingCarData && carData.length === 0} // Show loading only if car data is loading and not yet available
      searchBarPlaceholder="Filter details..."
    >
      <List.Section title="Driver Summary" subtitle={driver.team_name}>
        <List.Item
          title={driver.full_name}
          subtitle={`#${driver.driver_number} - ${getNationalityFlag(driver.country_code)} ${driver.country_code}`}
          icon={{ source: driver.headshot_url || Icon.Person, mask: Image.Mask.Circle, fallback: Icon.Person }}
          accessories={[
            {
              tag: {
                value: driver.team_name,
                color: driver.team_colour ? `#${driver.team_colour}` : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Driver Name" content={driver.full_name} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Current Position"
          accessories={[{ text: driver.current_position ? String(driver.current_position) : "N/A" }]}
        />
        <List.Item
          title="Interval"
          accessories={[
            {
              text:
                typeof driver.current_interval === "number"
                  ? `${driver.current_interval.toFixed(3)}s`
                  : driver.current_interval || "N/A",
            },
          ]}
        />
        <List.Item
          title="Gap to Leader"
          accessories={[
            {
              text:
                typeof driver.current_gap_to_leader === "number"
                  ? `${driver.current_gap_to_leader.toFixed(3)}s`
                  : driver.current_gap_to_leader || "N/A",
            },
          ]}
        />
        <List.Item
          title="Current Lap"
          accessories={[{ text: driver.current_lap_number ? String(driver.current_lap_number) : "N/A" }]}
        />
        <List.Item title="Last Lap Time" accessories={[{ text: formatLapTime(driver.last_lap_time) }]} />
        <List.Item
          title="Current Tyre"
          accessories={[
            { text: driver.tyre_compound ? `${driver.tyre_compound} (${driver.current_tyre_age ?? "?"} laps)` : "N/A" },
            ...(driver.tyre_compound
              ? [{ tag: { value: driver.tyre_compound, color: getTyreColor(driver.tyre_compound) } }]
              : []),
          ]}
        />
        <List.Item title="Total Pit Stops" accessories={[{ text: String(driver.total_pit_stops ?? 0) }]} />
        {driver.is_on_pit_out_lap && <List.Item title="Status" accessories={[{ text: "On Pit Out Lap" }]} />}
      </List.Section>

      {latestCarSample && (
        <List.Section
          title="Live Telemetry"
          subtitle={`Latest: ${new Date(latestCarSample.date).toLocaleTimeString()}`}
        >
          <List.Item
            title="Speed"
            accessories={[{ text: `${latestCarSample.speed ?? "N/A"} km/h` }]}
            icon={Icon.Gauge}
          />
          <List.Item
            title="RPM"
            accessories={[{ text: String(latestCarSample.rpm ?? "N/A") }]}
            icon={Icon.RotateAntiClockwise}
          />
          <List.Item title="Gear" accessories={[{ text: String(latestCarSample.n_gear ?? "N/A") }]} icon={Icon.Gear} />
          <List.Item
            title="Throttle"
            accessories={[{ text: `${latestCarSample.throttle ?? "N/A"} %` }]}
            icon={Icon.ArrowUp}
          />
          <List.Item
            title="Brake"
            accessories={[{ text: `${latestCarSample.brake ?? "N/A"} %` }]}
            icon={Icon.ArrowDown}
          />
          <List.Item title="DRS" accessories={[{ text: getDrsStatus(latestCarSample.drs) }]} icon={Icon.Paperclip} />
        </List.Section>
      )}
      {isLoadingCarData && !latestCarSample && (
        <List.Item title="Live Telemetry" accessories={[{ text: "Loading..." }]} />
      )}
      {carDataError && !latestCarSample && (
        <List.Item title="Live Telemetry" accessories={[{ text: `Error: ${carDataError}` }]} icon={Icon.Warning} />
      )}

      <List.Section title="Detailed Data">
        <List.Item
          title="View Lap Times"
          icon={Icon.List}
          accessories={[{ text: `${driverLaps.length} Laps` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Lap Times"
                icon={Icon.List}
                target={
                  <DriverLapDetailView
                    driver={driver}
                    laps={driverLaps}
                    sessionInfo={sessionInfo}
                    meetingInfo={meetingInfo}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Driver Name" content={driver.full_name} />
            </ActionPanel>
          }
        />
        <List.Item
          title="View Pit Stops"
          icon={Icon.Gear}
          accessories={[{ text: `${driverPitStops.length} Pit Stops` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Pit Stops"
                icon={Icon.Gear}
                target={
                  <DriverPitDetailView
                    driver={driver}
                    pitStops={driverPitStops}
                    sessionInfo={sessionInfo}
                    meetingInfo={meetingInfo}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Driver Name" content={driver.full_name} />
            </ActionPanel>
          }
        />
        <List.Item
          title="View Tyre Stints"
          icon={Icon.Layers} // Using Layers icon for stints
          accessories={[{ text: `${driverStints.length} Stints` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Tyre Stints"
                icon={Icon.Layers}
                target={
                  <DriverStintDetailView
                    driver={driver}
                    stints={driverStints}
                    sessionInfo={sessionInfo}
                    meetingInfo={meetingInfo}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Driver Name" content={driver.full_name} />
            </ActionPanel>
          }
        />
        <List.Item
          title="View Location Data"
          icon={Icon.Pin}
          accessories={[{ text: `${driverLocationData.length} Points` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Location Data"
                icon={Icon.Pin}
                target={
                  <DriverLocationDetailView
                    driver={driver}
                    locationData={driverLocationData}
                    sessionInfo={sessionInfo}
                    meetingInfo={meetingInfo}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Driver Name" content={driver.full_name} />
            </ActionPanel>
          }
        />
        <List.Item
          title="View Position History"
          icon={Icon.LineChart}
          accessories={[{ text: `${driverPositionHistory.length} Entries` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Position History"
                icon={Icon.LineChart}
                target={
                  <DriverPositionDetailView
                    driver={driver}
                    positionHistory={driverPositionHistory}
                    sessionInfo={sessionInfo}
                    meetingInfo={meetingInfo}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Driver Name" content={driver.full_name} />
            </ActionPanel>
          }
        />
        <List.Item
          title="View Driver Race Control Messages"
          icon={Icon.Megaphone}
          accessories={[{ text: `${driverRaceControlMessages.length} Messages` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Driver Race Control Messages"
                icon={Icon.Megaphone}
                target={
                  <DriverRaceControlDetailView
                    driver={driver}
                    messages={driverRaceControlMessages}
                    sessionInfo={sessionInfo}
                    meetingInfo={meetingInfo}
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Driver Name" content={driver.full_name} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Team Radio" subtitle={`${driverTeamRadio.length} Messages`}>
        {driverTeamRadio.length > 0 ? (
          driverTeamRadio.map((radio, index) => (
            <List.Item
              key={`radio-${radio.date}-${index}`}
              title={`Radio @ ${new Date(radio.date).toLocaleTimeString()}`}
              icon={Icon.SpeakerOn}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Play Team Radio" url={radio.recording_url} />
                  <Action.CopyToClipboard title="Copy Radio URL" content={radio.recording_url} />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.Item title="No Team Radio Messages Available" icon={Icon.SpeakerOff} />
        )}
      </List.Section>
    </List>
  );
}
