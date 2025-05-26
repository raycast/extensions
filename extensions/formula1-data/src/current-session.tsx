import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Image, LocalStorage } from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import fetch, { AbortError } from "node-fetch";
import { getCountryFlag, getNationalityFlag } from "./utils"; // Assuming utils.ts for flags
import WeatherDetailView from "./WeatherDetailView";
import RaceControlDetailView from "./RaceControlDetailView";
import DriverDetailView from "./DriverDetailView";

const OPENF1_API_BASE_URL = "https://api.openf1.org/v1";

const CURRENT_SESSION_CACHE_KEY = "currentSessionData_v2"; // Added a version to invalidate old cache

// --- Interfaces for OpenF1 API responses ---

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string; // e.g., "Race", "Qualifying", "Practice"
  meeting_key: number;
  meeting_name?: string; // Not directly in /sessions, but useful if we fetch /meetings
  circuit_short_name?: string;
  country_name?: string;
  date_start: string;
  date_end: string;
  year: number;
  location: string;
}

export interface OpenF1Driver {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  country_code: string;
  headshot_url?: string;
}

export interface OpenF1Position {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  position: number;
}

export interface OpenF1Interval {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  interval: number | string | null; // Can be number (seconds) or "+1 LAP" string
  gap_to_leader: number | string | null; // Can be number (seconds) or "+1 LAP" string
}

export interface OpenF1Lap {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  date_start: string; // To identify the latest lap
  is_pit_out_lap: boolean;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
  st_speed?: number | null; // Speed trap speed
  i1_speed?: number | null; // Speed at intermediate 1
  i2_speed?: number | null; // Speed at intermediate 2
}

export interface OpenF1Stint {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  stint_number: number;
  compound: string | null;
  tyre_age_at_start: number | null;
  lap_start: number;
  lap_end: number | null;
}

export interface OpenF1PitStop {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
  date: string; // To identify the latest pit stop
}

export interface OpenF1RaceControlMessage {
  session_key: number;
  meeting_key: number;
  date: string;
  category: string; // e.g., Flag, Drs, SafetyCar, CarEvent
  message: string;
  flag?: string; // e.g., YELLOW, GREEN, CHEQUERED
  scope?: string; // e.g., Track, Driver, Sector
  driver_number?: number | null;
  lap_number?: number | null;
}

export interface OpenF1WeatherDataPoint {
  session_key: number;
  meeting_key: number;
  date: string;
  air_temperature: number | null;
  track_temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  rainfall: number | null; // Boolean (0 or 1) or actual mm?
  wind_speed: number | null;
  wind_direction: number | null;
}

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string; // Overall meeting start
  year: number;
  circuit_key: number;
  country_key: number;
  gmt_offset: string;
}

export interface OpenF1TeamRadio {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  recording_url: string;
}

export interface OpenF1CarData {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  rpm: number | null;
  speed: number | null;
  n_gear: number | null;
  throttle: number | null;
  brake: number | null;
  drs: number | null; // See OpenF1 docs for DRS value mapping
}

export interface CombinedDriverData extends OpenF1Driver {
  current_position?: number;
  current_interval?: number | string | null;
  current_gap_to_leader?: number | string | null;
  last_lap_time?: number | null;
  current_lap_number?: number | null;
  is_on_pit_out_lap?: boolean;
  tyre_compound?: string | null;
  tyre_age_at_stint_start?: number | null;
  current_stint_lap_start?: number | null;
  current_tyre_age?: number | null; // Calculated: current_lap_number - current_stint_lap_start + tyre_age_at_stint_start
  total_pit_stops?: number;
  last_pit_lap?: number | null;
  last_pit_duration?: number | null;
}

export interface OpenF1LocationDataPoint {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

export interface OpenF1PositionDataPoint {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  position: number;
}

interface LiveSessionState {
  sessionInfo: OpenF1Session | null;
  meetingInfo: OpenF1Meeting | null;
  drivers: CombinedDriverData[];
  raceControlMessages: OpenF1RaceControlMessage[];
  weatherData: OpenF1WeatherDataPoint[];
  teamRadioMessages: OpenF1TeamRadio[];
  allPitStops: OpenF1PitStop[];
  allSessionLaps: OpenF1Lap[];
  allStints: OpenF1Stint[];
  allLocationData: OpenF1LocationDataPoint[];
  allPositionData: OpenF1PositionDataPoint[];
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isLive: boolean;
  sessionStatusMessage: string;

  // New state for dropdowns
  allMeetings: OpenF1Meeting[];
  selectedMeetingKey: string | null; // Store meeting_key as string for Dropdown value
  sessionsForMeeting: OpenF1Session[];
  selectedSessionKey: string | null; // Store session_key as string for Dropdown value
  cachedDataTimestamp?: number | null; // Timestamp of when the cache was last written
}

export default function CurrentSession() {
  const [state, setState] = useState<LiveSessionState>({
    sessionInfo: null,
    meetingInfo: null,
    drivers: [],
    raceControlMessages: [],
    weatherData: [],
    teamRadioMessages: [],
    allPitStops: [],
    allSessionLaps: [],
    allStints: [],
    allLocationData: [],
    allPositionData: [],
    isLoading: true,
    isLoadingDetails: true,
    error: null,
    lastUpdated: null,
    isLive: false,
    sessionStatusMessage: "Initializing...",
    allMeetings: [],
    selectedMeetingKey: null,
    sessionsForMeeting: [],
    selectedSessionKey: "latest", // Default to loading latest session
    cachedDataTimestamp: null,
  });

  const isInitialMount = useRef(true); // Ref to track initial mount for selectedSessionKey effect

  const fetchMeetings = useCallback(async (controller: AbortController) => {
    try {
      const currentYear = new Date().getFullYear();
      const yearsToFetch = Array.from(new Set([currentYear, 2025])); // Fetch current year and 2025

      let meetings: OpenF1Meeting[] = [];
      for (const year of yearsToFetch) {
        const response = await fetch(`${OPENF1_API_BASE_URL}/meetings?year=${year}`, { signal: controller.signal });
        if (!response.ok) {
          console.warn(`Failed to fetch meetings for year ${year}: ${response.statusText}`);
          continue;
        }
        const yearMeetings: OpenF1Meeting[] = await response.json();
        meetings = meetings.concat(yearMeetings);
      }

      // Remove duplicates by meeting_key and sort by date descending
      const uniqueMeetings = Array.from(new Map(meetings.map((m) => [m.meeting_key, m])).values()).sort(
        (a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime(),
      );

      setState((prev) => ({ ...prev, allMeetings: uniqueMeetings }));
    } catch (err) {
      if (err instanceof AbortError) {
        console.log("Meetings fetch aborted");
        return;
      }
      console.error("Error fetching meetings:", err);
      // Optionally show a toast or set an error state for meetings
    }
  }, []);

  const fetchSessionsForMeeting = useCallback(
    async (meetingKey: number, controller: AbortController, isUserSelection = true) => {
      if (!meetingKey) return;
      // When fetching new sessions, isLoading should be true for the main list if we expect to change sessionKey
      // If just populating for initial sync, primary content might not be "loading" in the same way.
      setState((prev) => ({
        ...prev,
        sessionsForMeeting: [],
        isLoading: isUserSelection,
        sessionStatusMessage: "Fetching sessions...",
      }));
      try {
        const response = await fetch(`${OPENF1_API_BASE_URL}/sessions?meeting_key=${meetingKey}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Failed to fetch sessions for meeting ${meetingKey}: ${response.statusText}`);
        let sessions: OpenF1Session[] = await response.json();
        sessions = sessions.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

        if (isUserSelection) {
          // Called from user changing the meeting dropdown
          setState((prev) => ({
            ...prev,
            sessionsForMeeting: sessions,
            isLoading: false, // Loading finishes after this
            selectedSessionKey: sessions.length > 0 ? sessions[0].session_key.toString() : null,
            sessionStatusMessage:
              sessions.length > 0 ? prev.sessionStatusMessage : "No sessions found for this meeting.", // Update status only if no sessions
          }));
        } else {
          // Called for initial sync, just populate
          setState((prev) => ({ ...prev, sessionsForMeeting: sessions, isLoading: false }));
        }
        // No specific message if sessions.length === 0 for initial sync, as main view is "latest"
      } catch (err) {
        if (err instanceof AbortError) {
          console.log("Sessions fetch aborted");
          setState((prev) => ({ ...prev, isLoading: false })); // Ensure loading is false on abort
          return;
        }
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred fetching sessions";
        console.error(errorMessage, err);
        showToast({ style: Toast.Style.Failure, title: "Error Fetching Sessions", message: errorMessage });
        // Ensure isLoading is false on error
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          sessionStatusMessage: `Error: ${errorMessage}`,
        }));
      }
    },
    [],
  );

  const fetchData = useCallback(async (fetchController: AbortController, sessionKeyToFetch?: string | null) => {
    const currentSessionKey = sessionKeyToFetch || state.selectedSessionKey || "latest";

    let sessionInfoForUpdate: OpenF1Session | null = null;
    let meetingInfoForUpdate: OpenF1Meeting | null = null;
    let isLiveForUpdate = false;
    let sessionStatusMessageForUpdate = "Fetching session data...";
    let raceControlForUpdate: OpenF1RaceControlMessage[] = [];
    let weatherForUpdate: OpenF1WeatherDataPoint[] = [];
    let teamRadioForUpdate: OpenF1TeamRadio[] = [];
    let allPitStopsForUpdate: OpenF1PitStop[] = [];
    let allLapsForUpdate: OpenF1Lap[] = [];
    let allStintsForUpdate: OpenF1Stint[] = [];
    let allLocationForUpdate: OpenF1LocationDataPoint[] = [];
    let allPositionForUpdate: OpenF1PositionDataPoint[] = [];
    let primaryDataError: string | null = null;

    // Set initial loading true for all parts
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isLoadingDetails: true,
      error: null,
      sessionStatusMessage: `Fetching data for session ${currentSessionKey}...`,
    }));

    try {
      // 1. Get the target session
      const sessionResponse = await fetch(`${OPENF1_API_BASE_URL}/sessions?session_key=${currentSessionKey}`, {
        signal: fetchController.signal,
      });
      if (!sessionResponse.ok) {
        if (sessionResponse.status === 404) {
          sessionStatusMessageForUpdate = "No active or recent F1 session found.";
          primaryDataError = sessionStatusMessageForUpdate;
        } else {
          primaryDataError = `Failed to fetch session: ${sessionResponse.statusText}`;
        }
        throw new Error(primaryDataError);
      }
      const sessionsData: OpenF1Session[] = await sessionResponse.json();
      if (!sessionsData || sessionsData.length === 0) {
        sessionStatusMessageForUpdate = "No session data returned from API.";
        primaryDataError = sessionStatusMessageForUpdate;
        throw new Error(primaryDataError);
      }
      sessionInfoForUpdate = sessionsData[0];

      const now = new Date();
      const sessionStart = new Date(sessionInfoForUpdate.date_start);
      const sessionEnd = new Date(sessionInfoForUpdate.date_end);
      isLiveForUpdate = now >= sessionStart && now <= sessionEnd;

      if (isLiveForUpdate) {
        sessionStatusMessageForUpdate = `Live: ${sessionInfoForUpdate.session_name} at ${sessionInfoForUpdate.location}`;
      } else if (now < sessionStart) {
        sessionStatusMessageForUpdate = `Upcoming: ${sessionInfoForUpdate.session_name} at ${sessionInfoForUpdate.location} (Starts: ${sessionStart.toLocaleString()})`;
      } else {
        sessionStatusMessageForUpdate = `Recently Finished: ${sessionInfoForUpdate.session_name} at ${sessionInfoForUpdate.location} (Ended: ${sessionEnd.toLocaleString()})`;
      }

      // Fetch Meeting Details early if meeting_key is present
      if (sessionInfoForUpdate.meeting_key) {
        try {
          const meetingApiResponse = await fetch(
            `${OPENF1_API_BASE_URL}/meetings?meeting_key=${sessionInfoForUpdate.meeting_key}`,
            { signal: fetchController.signal },
          );
          if (meetingApiResponse.ok) {
            const meetingData: OpenF1Meeting[] = await meetingApiResponse.json();
            if (meetingData.length > 0) meetingInfoForUpdate = meetingData[0];
          }
        } catch (e) {
          console.warn(`Error fetching meeting details: ${e}`);
        }
      }

      // Update state with session and meeting info - drivers still loading
      setState((prev) => ({
        ...prev,
        sessionInfo: sessionInfoForUpdate,
        meetingInfo: meetingInfoForUpdate,
        isLive: isLiveForUpdate,
        sessionStatusMessage: sessionStatusMessageForUpdate,
        isLoading: true,
        isLoadingDetails: true,
      }));

      if (!sessionInfoForUpdate?.session_key) {
        primaryDataError = "Selected session key is missing or invalid.";
        // Ensure isLoading is false if we throw here, to prevent infinite loading indicator
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isLoadingDetails: false,
          error: primaryDataError,
          sessionStatusMessage: `Error: ${primaryDataError}`,
        }));
        throw new Error(primaryDataError);
      }

      // Ensure meetingInfo is updated if it was fetched successfully based on sessionInfoForUpdate
      // This was part of the logic removed, ensure meetingInfo is correctly set if available.
      if (
        sessionInfoForUpdate.meeting_key &&
        (!state.meetingInfo || state.meetingInfo.meeting_key !== sessionInfoForUpdate.meeting_key)
      ) {
        try {
          const meetingApiResponse = await fetch(
            `${OPENF1_API_BASE_URL}/meetings?meeting_key=${sessionInfoForUpdate.meeting_key}`,
            { signal: fetchController.signal },
          );
          if (meetingApiResponse.ok) {
            const meetingData: OpenF1Meeting[] = await meetingApiResponse.json();
            if (meetingData.length > 0) {
              // Update meetingInfo directly here as it's tied to the session being fetched
              setState((prev) => ({ ...prev, meetingInfo: meetingData[0] }));
              meetingInfoForUpdate = meetingData[0]; // also update local var for consistency in this fetch cycle
            }
          }
        } catch (e) {
          console.warn(`Error re-fetching meeting details for session: ${e}`);
        }
      }

      // Fetch drivers for this session (priority)
      const driversResponse = await fetch(
        `${OPENF1_API_BASE_URL}/drivers?session_key=${sessionInfoForUpdate.session_key}`,
        { signal: fetchController.signal },
      );
      if (!driversResponse.ok) throw new Error(`Failed to fetch drivers: ${driversResponse.statusText}`);
      const driversApiData: OpenF1Driver[] = await driversResponse.json();

      // Partial state update for drivers to render them quickly
      const basicDrivers = driversApiData
        .map((d) => ({ ...d }))
        .sort((a, b) => parseInt(a.driver_number.toString()) - parseInt(b.driver_number.toString())); // Temporary sort or process later
      setState((prev) => ({ ...prev, drivers: basicDrivers, isLoading: false, isLoadingDetails: true }));

      // Fetch other data in parallel
      const [
        // positionsResponse, // Unused
        intervalsResponse,
        lapsResp,
        stintsResp,
        pitStopsResp,
        rcResponse,
        weatherResponse,
        teamRadioResp,
        locationResp,
        allPositionsResp, // For position history
      ] = await Promise.all([
        // positionsResponse, // Unused
        fetch(`${OPENF1_API_BASE_URL}/intervals?session_key=${sessionInfoForUpdate.session_key}`, {
          signal: fetchController.signal,
        }).catch((e) => {
          console.warn("Intervals fetch failed:", e);
          return null;
        }),
        fetch(`${OPENF1_API_BASE_URL}/laps?session_key=${sessionInfoForUpdate.session_key}`, {
          signal: fetchController.signal,
        }).catch((e) => {
          console.warn("Laps fetch failed:", e);
          return null;
        }),
        fetch(`${OPENF1_API_BASE_URL}/stints?session_key=${sessionInfoForUpdate.session_key}`, {
          signal: fetchController.signal,
        }).catch((e) => {
          console.warn("Stints fetch failed:", e);
          return null;
        }),
        fetch(`${OPENF1_API_BASE_URL}/pit?session_key=${sessionInfoForUpdate.session_key}`, {
          signal: fetchController.signal,
        }).catch((e) => {
          console.warn("Pitstops fetch failed:", e);
          return null;
        }),
        fetch(`${OPENF1_API_BASE_URL}/race_control?session_key=${sessionInfoForUpdate.session_key}`, {
          signal: fetchController.signal,
        }).catch((e) => {
          console.warn("Race Control fetch failed:", e);
          return null;
        }),
        fetch(`${OPENF1_API_BASE_URL}/weather?session_key=${sessionInfoForUpdate.session_key}`, {
          signal: fetchController.signal,
        }).catch((e) => {
          console.warn("Weather fetch failed:", e);
          return null;
        }),
        fetch(`${OPENF1_API_BASE_URL}/team_radio?session_key=${sessionInfoForUpdate.session_key}`, {
          signal: fetchController.signal,
        }).catch((e) => {
          console.warn("Team Radio fetch failed:", e);
          return null;
        }),
        fetch(`${OPENF1_API_BASE_URL}/location?session_key=${sessionInfoForUpdate.session_key}`, {
          signal: fetchController.signal,
        }).catch((e) => {
          console.warn("Location fetch failed:", e);
          return null;
        }),
        fetch(`${OPENF1_API_BASE_URL}/position?session_key=${sessionInfoForUpdate.session_key}`, {
          signal: fetchController.signal,
        }).catch((e) => {
          console.warn("Position History fetch failed:", e);
          return null;
        }),
      ]);

      const intervalsData: OpenF1Interval[] =
        intervalsResponse && intervalsResponse.ok ? await intervalsResponse.json() : [];
      allLapsForUpdate = lapsResp && lapsResp.ok ? await lapsResp.json() : [];
      allStintsForUpdate = stintsResp && stintsResp.ok ? await stintsResp.json() : [];
      allPitStopsForUpdate = pitStopsResp && pitStopsResp.ok ? await pitStopsResp.json() : [];
      raceControlForUpdate = rcResponse && rcResponse.ok ? await rcResponse.json() : [];
      weatherForUpdate = weatherResponse && weatherResponse.ok ? await weatherResponse.json() : [];
      teamRadioForUpdate = teamRadioResp && teamRadioResp.ok ? await teamRadioResp.json() : [];
      allLocationForUpdate = locationResp && locationResp.ok ? await locationResp.json() : [];
      allPositionForUpdate = allPositionsResp && allPositionsResp.ok ? await allPositionsResp.json() : [];

      raceControlForUpdate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      weatherForUpdate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      teamRadioForUpdate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      allLocationForUpdate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first for location
      allPositionForUpdate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first for position history

      const latestPositionsMap = new Map<number, OpenF1PositionDataPoint>();
      allPositionForUpdate.forEach((p) => {
        if (!latestPositionsMap.has(p.driver_number)) latestPositionsMap.set(p.driver_number, p);
      });
      const latestIntervalsMap = new Map<number, OpenF1Interval>();
      intervalsData
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .forEach((i) => {
          if (!latestIntervalsMap.has(i.driver_number)) latestIntervalsMap.set(i.driver_number, i);
        });
      const latestLapsMap = new Map<number, OpenF1Lap>();
      allLapsForUpdate.sort(
        (a, b) =>
          (a.lap_number || 0) - (b.lap_number || 0) ||
          new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
      );
      const latestStintsMap = new Map<number, OpenF1Stint>();
      allStintsForUpdate.sort(
        (a, b) => (a.stint_number || 0) - (b.stint_number || 0) || (a.lap_start || 0) - (b.lap_start || 0),
      );

      const driverPitStopCounts = new Map<number, number>();
      const latestPitStopInfo = new Map<number, OpenF1PitStop>();
      const processingPitStops = [...allPitStopsForUpdate];
      processingPitStops.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      processingPitStops.forEach((pit) => {
        driverPitStopCounts.set(pit.driver_number, (driverPitStopCounts.get(pit.driver_number) || 0) + 1);
        if (!latestPitStopInfo.has(pit.driver_number)) {
          latestPitStopInfo.set(pit.driver_number, pit);
        }
      });

      const processingLaps = [...allLapsForUpdate];
      processingLaps.sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime()); // Sort newest first for latestLap
      processingLaps.forEach((lap) => {
        if (!latestLapsMap.has(lap.driver_number)) {
          latestLapsMap.set(lap.driver_number, lap);
        }
      });

      const combinedDriversData: CombinedDriverData[] = driversApiData
        .map((driver) => {
          const driverNumber = driver.driver_number;
          const latestPosition = latestPositionsMap.get(driverNumber);
          const latestInterval = latestIntervalsMap.get(driverNumber);
          const latestLap = latestLapsMap.get(driverNumber);
          const latestStint = latestStintsMap.get(driverNumber);
          const pitStopsCount = driverPitStopCounts.get(driverNumber) || 0;
          const lastPit = latestPitStopInfo.get(driverNumber);
          let currentTyreAge = null;
          if (
            latestStint &&
            latestLap &&
            latestLap.lap_number &&
            latestStint.lap_start &&
            latestStint.tyre_age_at_start !== null
          ) {
            currentTyreAge = latestLap.lap_number - latestStint.lap_start + latestStint.tyre_age_at_start;
          }
          return {
            ...driver,
            current_position: latestPosition?.position,
            current_interval: latestInterval?.interval,
            current_gap_to_leader: latestInterval?.gap_to_leader,
            last_lap_time: latestLap?.lap_duration,
            current_lap_number: latestLap?.lap_number,
            is_on_pit_out_lap: latestLap?.is_pit_out_lap,
            tyre_compound: latestStint?.compound,
            tyre_age_at_stint_start: latestStint?.tyre_age_at_start,
            current_stint_lap_start: latestStint?.lap_start,
            current_tyre_age: currentTyreAge,
            total_pit_stops: pitStopsCount,
            last_pit_lap: lastPit?.lap_number,
            last_pit_duration: lastPit?.pit_duration,
          };
        })
        .sort((a, b) => (a.current_position || 99) - (b.current_position || 99));

      const newStateSnapshot: Partial<LiveSessionState> = {
        sessionInfo: sessionInfoForUpdate,
        meetingInfo: meetingInfoForUpdate,
        drivers: combinedDriversData,
        raceControlMessages: raceControlForUpdate,
        weatherData: weatherForUpdate,
        teamRadioMessages: teamRadioForUpdate,
        allPitStops: allPitStopsForUpdate,
        allSessionLaps: allLapsForUpdate,
        allStints: allStintsForUpdate,
        allLocationData: allLocationForUpdate,
        allPositionData: allPositionForUpdate,
        isLoading: false,
        isLoadingDetails: false,
        error: null, // Cleared on successful fetch
        lastUpdated: new Date(),
        isLive: isLiveForUpdate,
        sessionStatusMessage: sessionStatusMessageForUpdate,
        // Persist dropdown selections and their data if they were part of the state that led to this fetch
        allMeetings: state.allMeetings, // Keep existing meetings, fetchData doesn't refetch them
        selectedMeetingKey: state.selectedMeetingKey,
        sessionsForMeeting: state.sessionsForMeeting,
        selectedSessionKey: state.selectedSessionKey, // This should be the key that was fetched
        cachedDataTimestamp: new Date().getTime(),
      };

      setState((prev) => ({
        ...prev, // Spread previous state first
        ...newStateSnapshot, // Then apply all new data
      }));

      try {
        // Create a cacheable state, excluding non-serializable or very large/dynamic items if necessary
        // For now, caching most of the fetched data. Be mindful of LocalStorage limits (around 5MB).
        const cacheableState: Partial<LiveSessionState> = { ...newStateSnapshot };
        // We might want to exclude things like `isLoading`, `error` from being cached if they are transient.
        // However, caching `sessionStatusMessage` might be useful.
        // Ensure all cached fields are part of LiveSessionState and serializable.
        delete cacheableState.isLoading; // Don't cache loading state
        delete cacheableState.isLoadingDetails;
        // error is already set to null in newStateSnapshot on success
        // lastUpdated and cachedDataTimestamp are already Date/number.

        await LocalStorage.setItem(CURRENT_SESSION_CACHE_KEY, JSON.stringify(cacheableState));
        showToast({
          style: Toast.Style.Success,
          title: "Data Refreshed",
          message: "Latest session data updated and cached.",
        });
      } catch (cacheError) {
        console.error("Failed to save data to cache", cacheError);
        showToast({
          style: Toast.Style.Failure,
          title: "Cache Error",
          message: "Could not save latest data to cache.",
        });
      }
    } catch (err) {
      if (err instanceof AbortError) {
        console.log("Fetch aborted");
        // If primary data (session/drivers) failed, we might want to keep isLoading true or reflect error appropriately
        setState((prevState) => ({ ...prevState, isLoading: false, isLoadingDetails: false }));
        return;
      }
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Error fetching live session data:", errorMessage);
      showToast({ style: Toast.Style.Failure, title: "Error Fetching Data", message: errorMessage });
      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        isLoadingDetails: false,
        error: errorMessage,
        sessionStatusMessage: `Error: ${errorMessage}`,
      }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialData() {
      // Try to load from cache first
      try {
        const cachedDataString = await LocalStorage.getItem<string>(CURRENT_SESSION_CACHE_KEY);
        if (cachedDataString) {
          const cachedState: Partial<LiveSessionState> = JSON.parse(cachedDataString);
          // Convert date strings back to Date objects if necessary for lastUpdated
          // For other complex objects, ensure they are correctly revived if not plain JSON
          const lastUpdated = cachedState.lastUpdated ? new Date(cachedState.lastUpdated) : null;
          const cachedDataTimestamp = cachedState.cachedDataTimestamp ? cachedState.cachedDataTimestamp : null;

          setState((prev) => ({
            ...prev,
            ...cachedState,
            lastUpdated,
            cachedDataTimestamp,
            isLoading: false, // Loaded from cache, main loading is done for initial display
            isLoadingDetails: true, // Still need to fetch details or refresh
            sessionStatusMessage: cachedState.sessionStatusMessage || "Displaying cached data. Refreshing...",
          }));
          showToast({
            style: Toast.Style.Success,
            title: "Displayed Cached Data",
            message: "Refreshing in background...",
          });
        } else {
          // No cache, set status to fetching for the first time.
          setState((prev) => ({ ...prev, isLoading: true, sessionStatusMessage: "Fetching session data..." }));
        }
      } catch (e) {
        console.error("Failed to load or parse data from cache", e);
        await LocalStorage.removeItem(CURRENT_SESSION_CACHE_KEY); // Clear corrupted cache
        setState((prev) => ({ ...prev, isLoading: true, error: "Failed to load cached data. Fetching anew..." }));
      }

      // Fetch meetings regardless of cache for dropdowns (lightweight)
      await fetchMeetings(controller);

      // Trigger fetch for selected session (latest or specific)
      // This will run after cache is potentially loaded and meetings are fetched.
      // The fetchData itself will handle setting isLoading appropriately during its execution.
      // If cache was loaded, this fetchData acts as a background refresh.
      if (state.selectedSessionKey) {
        // Check if selectedSessionKey is available from cache or default
        fetchData(controller, state.selectedSessionKey);
      }
    }

    loadInitialData();

    // Setup interval for live updates
    const intervalId = setInterval(() => {
      if (state.sessionInfo && (state.selectedSessionKey === "latest" || state.isLive)) {
        const updateController = new AbortController();
        // Pass a flag or different handler if we need to distinguish interval updates from initial/cache-refresh updates
        fetchData(updateController, state.selectedSessionKey);
      }
    }, 15000); // Keep existing interval

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
    // Dependencies: fetchMeetings, fetchData. state.selectedSessionKey is used internally but its change triggers a different useEffect.
    // The state.isLive and state.sessionInfo are for the interval logic.
    // This effect should run once on mount, and also if critical functions change (which they shouldn't).
  }, [fetchMeetings, fetchData]);

  // This useEffect is crucial for reacting to session changes from dropdowns
  // AND for the initial load if selectedSessionKey was set by cache or is default "latest"
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // On initial mount, data fetching is handled by loadInitialData in the main useEffect.
      // So, we skip fetching here to avoid a double fetch.
      return;
    }

    const controller = new AbortController();
    if (state.selectedSessionKey) {
      // If we just loaded from cache, isLoading might be false. fetchData will manage its own loading state.
      // No need to set isLoading: true here unconditionally, as fetchData does it.
      fetchData(controller, state.selectedSessionKey);
    }
    return () => {
      controller.abort();
    };
  }, [state.selectedSessionKey]); // Removed fetchData from here as it causes re-runs when its own state updates affect it.

  // New useEffect for syncing dropdowns after initial "latest" session data is loaded
  useEffect(() => {
    if (
      state.sessionInfo &&
      state.sessionInfo.meeting_key &&
      state.selectedSessionKey === "latest" &&
      state.allMeetings.length > 0
    ) {
      const latestSessionMeetingKey = state.sessionInfo.meeting_key.toString();

      // Check if the meeting dropdown needs to be updated or sessions for it fetched
      if (
        state.selectedMeetingKey !== latestSessionMeetingKey ||
        state.sessionsForMeeting.every((s) => s.meeting_key !== state.sessionInfo?.meeting_key)
      ) {
        setState((prev) => ({ ...prev, selectedMeetingKey: latestSessionMeetingKey }));
        const controller = new AbortController();
        // Fetch sessions for this meeting, but indicate it's NOT a user selection
        // so it doesn't override selectedSessionKey from "latest"
        fetchSessionsForMeeting(state.sessionInfo.meeting_key, controller, false);
      }
    }
    // Watch for changes in the loaded sessionInfo (especially its meeting_key) and when allMeetings are available.
    // Also depends on selectedSessionKey to ensure this primarily acts on "latest".
  }, [state.sessionInfo, state.allMeetings, state.selectedSessionKey, fetchSessionsForMeeting]);

  const handleMeetingChange = (newMeetingKey: string) => {
    setState((prev) => ({
      ...prev,
      selectedMeetingKey: newMeetingKey,
      sessionsForMeeting: [],
      selectedSessionKey: null,
    }));
    if (newMeetingKey) {
      const controller = new AbortController(); // Abort old fetches if any for sessions
      // When user changes meeting, isUserSelection is true by default (or explicitly pass true)
      fetchSessionsForMeeting(parseInt(newMeetingKey), controller /* implicitly true */);
    }
  };

  const handleSessionChange = (newSessionKey: string) => {
    setState((prev) => ({ ...prev, selectedSessionKey: newSessionKey }));
    // Data fetching is handled by the useEffect watching selectedSessionKey
  };

  const getDriverAccessories = (driver: CombinedDriverData): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];

    if (driver.current_position !== 1) {
      // Only show for P2 onwards
      if (driver.current_interval !== undefined && driver.current_interval !== null) {
        accessories.push({
          text: `Int: ${typeof driver.current_interval === "number" ? driver.current_interval.toFixed(3) : driver.current_interval}`,
        });
      }
      if (driver.current_gap_to_leader !== undefined && driver.current_gap_to_leader !== null) {
        accessories.push({
          text: `Gap: ${typeof driver.current_gap_to_leader === "number" ? driver.current_gap_to_leader.toFixed(3) : driver.current_gap_to_leader}`,
        });
      }
    }

    if (driver.team_name) {
      accessories.push({
        tag: { value: driver.team_name, color: driver.team_colour ? `#${driver.team_colour}` : Color.SecondaryText },
      });
    }
    return accessories;
  };

  return (
    <List
      isLoading={state.isLoading} // Main isLoading for initial view
      navigationTitle={state.sessionInfo ? `${state.sessionInfo.session_name} - Live Status` : "Current F1 Session"}
      searchBarPlaceholder="Filter drivers..."
      searchBarAccessory={
        <>
          <List.Dropdown
            tooltip="Select Race Event (Meeting)"
            value={state.selectedMeetingKey || ""}
            onChange={handleMeetingChange}
            storeValue={false} // Don't persist selection across launches, let it default to latest
          >
            <List.Dropdown.Section title="Meetings">
              {state.allMeetings.length === 0 && <List.Dropdown.Item title="Loading Meetings..." value="" />}
              {state.allMeetings.map((meeting) => (
                <List.Dropdown.Item
                  key={meeting.meeting_key}
                  title={`${meeting.meeting_name} (${meeting.year})`}
                  value={meeting.meeting_key.toString()}
                  icon={getCountryFlag(meeting.country_name || "")}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>

          <List.Dropdown
            tooltip="Select Session"
            value={state.selectedSessionKey || ""}
            onChange={handleSessionChange}
            storeValue={false}
          >
            <List.Dropdown.Section title="Sessions">
              {state.selectedMeetingKey && state.sessionsForMeeting.length === 0 && !state.isLoading && (
                <List.Dropdown.Item title="No Sessions Found" value="" />
              )}
              {state.selectedMeetingKey && state.sessionsForMeeting.length === 0 && state.isLoading && (
                <List.Dropdown.Item title="Loading Sessions..." value="" />
              )}
              {!state.selectedMeetingKey && <List.Dropdown.Item title="Select a Race First" value="" />}
              {state.sessionsForMeeting.map((session) => (
                <List.Dropdown.Item
                  key={session.session_key}
                  title={session.session_name}
                  value={session.session_key.toString()}
                />
              ))}
              {/* Option to go back to live/latest */}
              <List.Dropdown.Item title="Latest Live/Recent Session" value="latest" icon={Icon.Livestream} />
            </List.Dropdown.Section>
          </List.Dropdown>
        </>
      }
    >
      {state.error && !state.drivers.length && !state.sessionInfo && !state.isLoading ? (
        <List.EmptyView title="Error" description={state.error} icon={Icon.Warning} />
      ) : !state.sessionInfo &&
        !state.isLoading &&
        state.selectedSessionKey !== "latest" &&
        state.allMeetings.length > 0 ? (
        <List.EmptyView
          title="Select a Session"
          description="Please select a race and session from the dropdowns above."
          icon={Icon.Calendar}
        />
      ) : !state.sessionInfo && !state.isLoading ? (
        <List.EmptyView
          title="No Session Active"
          description={state.sessionStatusMessage || "No current or upcoming F1 session found."}
          icon={Icon.Calendar}
        />
      ) : state.sessionInfo ? (
        <>
          <List.Section
            title="Session Overview"
            subtitle={
              state.meetingInfo
                ? `${state.meetingInfo.circuit_short_name}, ${state.meetingInfo.country_name}`
                : state.sessionInfo?.location || ""
            }
          >
            <List.Item
              title="Weather Information"
              icon={Icon.Cloud}
              accessories={[
                {
                  text: state.isLoadingDetails
                    ? "Loading..."
                    : state.weatherData.length > 0
                      ? `Latest: ${new Date(state.weatherData[0].date).toLocaleTimeString()}`
                      : "No data",
                },
              ]}
              actions={
                state.weatherData.length > 0 ? (
                  <ActionPanel>
                    <Action.Push
                      title="View Weather Details"
                      icon={Icon.List}
                      target={<WeatherDetailView weatherData={state.weatherData} sessionInfo={state.sessionInfo} />}
                    />
                  </ActionPanel>
                ) : undefined
              }
            />
            <List.Item
              title="Race Control Messages"
              icon={Icon.Message}
              accessories={[
                { text: state.isLoadingDetails ? "Loading..." : `${state.raceControlMessages.length} messages` },
              ]}
              actions={
                state.raceControlMessages.length > 0 ? (
                  <ActionPanel>
                    <Action.Push
                      title="View Race Control Log"
                      icon={Icon.List}
                      target={
                        <RaceControlDetailView
                          messages={state.raceControlMessages}
                          sessionInfo={state.sessionInfo}
                          drivers={state.drivers.map((d) => ({
                            driver_number: d.driver_number,
                            name_acronym: d.name_acronym,
                            full_name: d.full_name,
                          }))}
                        />
                      }
                    />
                  </ActionPanel>
                ) : undefined
              }
            />
          </List.Section>

          <List.Section
            title="Driver Standings"
            subtitle={`Last updated: ${state.lastUpdated ? state.lastUpdated.toLocaleTimeString() : "N/A"}`}
          >
            {state.drivers.map((driver) => (
              <List.Item
                key={driver.driver_number}
                icon={{
                  source: driver.headshot_url || getNationalityFlag(driver.country_code || ""),
                  fallback: Icon.Person,
                  mask: driver.headshot_url ? Image.Mask.Circle : undefined,
                }}
                title={`${driver.current_position ? "P" + driver.current_position : state.isLoadingDetails && !driver.current_position ? "..." : "POS N/A"} - ${driver.full_name} (#${driver.driver_number})`}
                subtitle={driver.name_acronym}
                accessories={
                  state.isLoadingDetails && !driver.current_position
                    ? [{ text: "Loading data..." }]
                    : getDriverAccessories(driver)
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Driver Details"
                      icon={Icon.Person}
                      target={
                        <DriverDetailView
                          driver={driver}
                          sessionInfo={state.sessionInfo}
                          meetingInfo={state.meetingInfo}
                          allLaps={state.allSessionLaps}
                          allPitStops={state.allPitStops}
                          allTeamRadio={state.teamRadioMessages}
                          allStints={state.allStints}
                          allLocationData={state.allLocationData}
                          allPositionData={state.allPositionData}
                          allRaceControlMessages={state.raceControlMessages}
                        />
                      }
                    />
                    <Action.CopyToClipboard title="Copy Driver Name" content={driver.full_name} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {!state.isLoading && state.drivers.length === 0 && state.isLive && (
            <List.EmptyView
              title="Waiting for driver data"
              description="Live session started, waiting for driver positions..."
              icon={Icon.Clock}
            />
          )}
        </>
      ) : null}
      {/* Fallback for when sessionInfo itself is null after trying to load and failing */}
      {!state.isLoading && !state.sessionInfo && state.error && (
        <List.EmptyView
          title="Error Loading Session"
          description={state.error || "Could not load session details."}
          icon={Icon.Warning}
        />
      )}
    </List>
  );
}

export function getRaceControlIcon(category: string, flag?: string | null): Icon {
  if (flag) {
    switch (flag.toUpperCase()) {
      case "YELLOW":
        return Icon.Flag;
      case "GREEN":
        return Icon.Play;
      case "RED":
        return Icon.Stop;
      case "BLUE":
        return Icon.Info;
      case "CHEQUERED":
        return Icon.Goal;
      case "BLACK AND WHITE":
        return Icon.Exclamationmark;
      case "BLACK":
        return Icon.RemovePerson; // Or something more severe
      default:
        break;
    }
  }
  switch (category.toUpperCase()) {
    case "SAFETYCAR":
    case "VIRTUALSAFETYCAR":
      return Icon.Shield;
    case "DRS":
      return Icon.Paperclip; // Or a speed icon
    case "TRACK":
      return Icon.Layers;
    case "FLAG":
      return Icon.Flag;
    case "CAR EVENT":
    case "INCIDENT":
      return Icon.Warning;
    default:
      return Icon.Message;
  }
}
