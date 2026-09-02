import {
  Cache,
  Color,
  getPreferenceValues,
  Icon,
  MenuBarExtra,
  open,
} from "@raycast/api";
import { useCachedState, useLocalStorage } from "@raycast/utils";
import { useEffect, useCallback, useRef } from "react";
import {
  FlightAwareStatus,
  FlightRoute,
  FlightSchedule,
  OpenSkyState,
  Preferences,
} from "./types";
import {
  toIcaoCallsign,
  toDisplayFlightNumber,
  toIataAirlineCode,
} from "./data/airline-codes";
import { fetchFlightRoute, fetchFlightSchedule } from "./api/airlabs";
import { fetchFlightState } from "./api/opensky";
import { fetchFlightStateByCallsign } from "./api/adsblol";
import { fetchFlightStatus } from "./api/flightaware";
import { deriveFlightPhase } from "./utils/flight-phase";
import { estimateEta } from "./utils/eta";
import { getMenuBarIcon } from "./utils/menu-bar-icon";
import { resolveMenuBarIcon } from "./utils/menu-bar-icon-choice";
import { airlineLogoUrl } from "./utils/airline-logo";
import { buildMenuBarTitle } from "./utils/menu-bar-title";
import { deriveMenuBarDisplay } from "./utils/menu-bar-display";
import { effectiveArrivalMs, isScheduleExpired } from "./utils/schedule";
import {
  formatAltitude,
  formatSpeed,
  formatHeading,
  formatEta,
  formatTime,
} from "./utils/format";

const cache = new Cache();
const ALTITUDE_HISTORY_SIZE = 3;
const LANDED_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const SCHEDULE_EXPIRY_BUFFER_MS = 2 * 60 * 60 * 1000; // 2h past scheduled arrival
const STALE_UPDATE_MS = 6 * 60 * 60 * 1000; // 6h since last update

export default function Command() {
  const {
    airlabsApiKey,
    flightAwareApiKey,
    alwaysShow,
    menuBarIcon,
    showFlightNumber,
    showStatus,
    showEta,
  } = getPreferenceValues<Preferences>();
  const {
    value: flightNumber,
    isLoading: isFlightLoading,
    removeValue: clearFlight,
  } = useLocalStorage<string>("flight-number");

  const icaoCallsign = flightNumber ? toIcaoCallsign(flightNumber) : null;

  const [route, setRoute] = useCachedState<FlightRoute | null>(
    "flight-route",
    null,
  );
  const [schedule, setSchedule] = useCachedState<FlightSchedule | null>(
    "flight-schedule-v2",
    null,
  );
  const [flightState, setFlightState] = useCachedState<OpenSkyState | null>(
    "flight-state",
    null,
  );
  const [altitudeHistory, setAltitudeHistory] = useCachedState<number[]>(
    "altitude-history",
    [],
  );
  const [wasAirborne, setWasAirborne] = useCachedState<boolean>(
    "was-airborne",
    false,
  );
  const [lastUpdated, setLastUpdated] = useCachedState<string | null>(
    "last-updated",
    null,
  );
  const [isLoading, setIsLoading] = useCachedState<boolean>("is-loading", true);
  const [landedAt, setLandedAt] = useCachedState<string | null>(
    "landed-at",
    null,
  );
  const [faStatus, setFaStatus] = useCachedState<FlightAwareStatus | null>(
    "fa-status",
    null,
  );

  const isFetching = useRef(false);
  // The last schedule arrTimeTs that caused an expiry reset, so the same stale
  // schedule (refetched after the reset) can't immediately re-trigger another.
  const lastResetArrTs = useRef<number | null>(null);

  // Mutable values read inside fetchData, mirrored into a ref so fetchData's
  // identity does not depend on state it sets. Otherwise the mount effect
  // (which depends on fetchData) re-runs when these commit and fires a second
  // full fetch cycle — 2x OpenSky (rate-limited) and 2x FlightAware (paid).
  const latest = useRef({ route, schedule, wasAirborne, landedAt });
  latest.current = { route, schedule, wasAirborne, landedAt };

  // Check if the flight landed more than 30 minutes ago
  const isExpired =
    landedAt != null &&
    Date.now() - new Date(landedAt).getTime() > LANDED_EXPIRY_MS;

  const resetAllState = useCallback(() => {
    setRoute(null);
    setSchedule(null);
    setFlightState(null);
    setAltitudeHistory([]);
    setWasAirborne(false);
    setLastUpdated(null);
    setIsLoading(true);
    setLandedAt(null);
    setFaStatus(null);
  }, []);

  // A stale past-dated schedule shouldn't expire a flight the aircraft is still
  // flying — otherwise reset -> refetch-same-schedule -> reset loops forever.
  // Only evaluate expiry once a fetch has settled (!isLoading): while telemetry
  // is still in flight, schedule is set before flightState, and a delayed flight
  // would otherwise reset mid-fetch and trigger an extra (paid) refetch.
  const isAirborneNow = flightState != null && !flightState.onGround;
  const scheduleExpired =
    !isLoading &&
    // Don't re-trigger for a schedule we've already reset once: after a reset
    // the same stale arrTimeTs would be refetched, so without this latch a
    // genuinely-gone flight could loop reset<->refetch (paid) indefinitely.
    schedule?.arrTimeTs !== lastResetArrTs.current &&
    isScheduleExpired(
      schedule,
      Date.now(),
      SCHEDULE_EXPIRY_BUFFER_MS,
      isAirborneNow,
    );

  const lastUpdateStale =
    lastUpdated != null &&
    Date.now() - new Date(lastUpdated).getTime() > STALE_UPDATE_MS;

  const needsReset = isExpired || scheduleExpired || lastUpdateStale;

  useEffect(() => {
    if (needsReset) {
      if (scheduleExpired && schedule) {
        lastResetArrTs.current = schedule.arrTimeTs;
      }
      resetAllState();
    }
  }, [needsReset, resetAllState, scheduleExpired, schedule]);

  const fetchData = useCallback(async () => {
    if (!icaoCallsign || isFetching.current) return;

    isFetching.current = true;

    try {
      setIsLoading(true);

      // Fetch route if not cached
      let currentRoute = latest.current.route;
      if (!currentRoute) {
        currentRoute = await fetchFlightRoute(icaoCallsign, airlabsApiKey);
        if (currentRoute) {
          setRoute(currentRoute);
        }
      }

      if (!currentRoute) {
        setFlightState(null);
        setIsLoading(false);
        return;
      }

      // Fetch schedule if not cached (one-time, alongside route)
      if (!latest.current.schedule) {
        const sched = await fetchFlightSchedule(
          icaoCallsign,
          airlabsApiKey,
          currentRoute.depIata,
        );
        if (sched) {
          setSchedule(sched);
        }
      }

      // Fetch live state from OpenSky + FlightAware (if configured) in parallel.
      // OpenSky needs the ICAO24 hex; a schedule-derived route has none, so skip
      // straight to the ADSB.lol callsign lookup below.
      const [openSkyState, faResult] = await Promise.all([
        currentRoute.hex
          ? fetchFlightState(currentRoute.hex)
          : Promise.resolve(null),
        flightAwareApiKey
          ? fetchFlightStatus(icaoCallsign, flightAwareApiKey)
          : Promise.resolve(null),
      ]);

      // Fall back to ADSB.lol if OpenSky has no data
      const state =
        openSkyState ?? (await fetchFlightStateByCallsign(icaoCallsign));
      setFlightState(state);
      if (flightAwareApiKey) {
        setFaStatus(faResult);
      }

      if (state) {
        // Update altitude history
        if (state.baroAltitude != null) {
          setAltitudeHistory((prev) => {
            const updated = [...prev, state.baroAltitude!];
            return updated.slice(-ALTITUDE_HISTORY_SIZE);
          });
        }

        // Track airborne status and landing time
        if (!state.onGround) {
          setWasAirborne(true);
          setLandedAt(null);
        } else if (latest.current.wasAirborne && !latest.current.landedAt) {
          setLandedAt(new Date().toISOString());
        }

        setLastUpdated(new Date().toISOString());
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [icaoCallsign, airlabsApiKey, flightAwareApiKey]);

  // Skip fetching while a reset is pending; once resetAllState clears the stale
  // state, needsReset flips to false and this effect re-runs to repopulate
  // (so a reset can't leave the menu bar stuck in the loading state).
  useEffect(() => {
    if (!needsReset) {
      fetchData();
    }
  }, [fetchData, needsReset]);

  // Early returns for loading / no flight set (after all hooks)
  if (isFlightLoading) {
    return <MenuBarExtra isLoading={true} />;
  }

  if (!flightNumber) {
    if (alwaysShow) {
      return (
        <MenuBarExtra
          icon={{ source: Icon.Airplane, tintColor: Color.SecondaryText }}
          title="No Flight Set"
          isLoading={false}
        >
          <MenuBarExtra.Item title='Use "Set Flight" command to track a flight' />
        </MenuBarExtra>
      );
    }
    return null;
  }

  // If callsign can't be resolved, show error in menu bar
  if (!icaoCallsign) {
    const displayNumber = toDisplayFlightNumber(flightNumber);
    return (
      <MenuBarExtra
        icon={{ source: Icon.Airplane, tintColor: Color.Red }}
        title={`${displayNumber}: Unknown Airline`}
        isLoading={false}
      >
        <MenuBarExtra.Item
          title={`Could not resolve airline code for ${displayNumber}`}
        />
      </MenuBarExtra>
    );
  }

  // Derive flight phase and ETA
  const phase = flightState
    ? deriveFlightPhase(flightState, altitudeHistory, wasAirborne)
    : null;

  // FlightAware predictive ETA (preferred when available)
  // Fall back to estimated_in (gate arrival) when estimated_on (landing) is null
  const faEtaTimestamp = faStatus?.estimatedOn ?? faStatus?.estimatedIn;
  const faEtaHours = faEtaTimestamp
    ? (new Date(faEtaTimestamp).getTime() - Date.now()) / 3_600_000
    : null;

  // Haversine ETA as fallback
  const haversineEta =
    flightState &&
    route &&
    flightState.latitude != null &&
    flightState.longitude != null &&
    flightState.velocity != null
      ? estimateEta(
          flightState.latitude,
          flightState.longitude,
          route.arrLat,
          route.arrLng,
          flightState.velocity,
        )
      : null;

  // Prefer FlightAware ETA (only if positive, i.e. still in the future)
  const eta = faEtaHours != null && faEtaHours > 0 ? faEtaHours : haversineEta;
  const etaFormatted = eta != null ? formatEta(eta) : null;

  // Schedule arrival time as a reference (adjusted for delay)
  const scheduledArrival =
    schedule && schedule.arrTimeTs > 0
      ? new Date(effectiveArrivalMs(schedule))
      : null;

  // Build menu bar title
  const displayNumber = toDisplayFlightNumber(flightNumber);

  // Hide menu bar item when flight is inactive/expired and alwaysShow is off
  if (!isLoading && !flightState && !alwaysShow) {
    return null;
  }
  if (isExpired && !alwaysShow) {
    return null;
  }

  // Derive the menu bar display strings (override, status word, ETA).
  const { overrideStatus, statusText, etaText } = deriveMenuBarDisplay({
    faStatus,
    isExpired,
    isLoading,
    hasRoute: !!route,
    hasFlightState: !!flightState,
    phase,
    etaFormatted,
  });

  // Build the title, then resolve the menu bar icon per the user's preference
  // (airline logo, app phase icon, or none).
  const menuBarTitle = buildMenuBarTitle(
    displayNumber,
    statusText,
    etaText,
    showFlightNumber,
    showStatus,
    showEta,
  );

  const phaseIcon = getMenuBarIcon(phase, overrideStatus, !!route, isExpired);
  const logoUrl = airlineLogoUrl(toIataAirlineCode(flightNumber));
  // Force an icon when the title is empty so the menu bar item is never blank.
  const menuIcon = resolveMenuBarIcon(
    menuBarIcon,
    phaseIcon,
    logoUrl,
    menuBarTitle === "",
  );

  const routeDisplay = route
    ? `${route.depIata} → ${route.arrIata}`
    : "Unknown";

  const flightradar24Url = route?.hex
    ? `https://www.flightradar24.com/${icaoCallsign}/${route.hex}`
    : `https://www.flightradar24.com/${icaoCallsign}`;

  return (
    <MenuBarExtra
      icon={menuIcon}
      title={menuBarTitle || undefined}
      isLoading={isLoading}
      tooltip={`Flight ${displayNumber}`}
    >
      <MenuBarExtra.Section title="Flight Details">
        <MenuBarExtra.Item title={`Flight: ${displayNumber}`} />
        {phase && <MenuBarExtra.Item title={`Status: ${phase}`} />}
        {!flightState && !isLoading && (
          <MenuBarExtra.Item title="Status: Not currently tracked" />
        )}
        {flightState && (
          <>
            <MenuBarExtra.Item
              title={`Altitude: ${formatAltitude(flightState.baroAltitude)}`}
            />
            <MenuBarExtra.Item
              title={`Speed: ${formatSpeed(flightState.velocity)}`}
            />
            <MenuBarExtra.Item
              title={`Heading: ${formatHeading(flightState.trueTrack)}`}
            />
          </>
        )}
        <MenuBarExtra.Item title={`Route: ${routeDisplay}`} />
        {etaFormatted != null && (
          <MenuBarExtra.Item title={`ETA: ${etaFormatted}`} />
        )}
        {scheduledArrival && (
          <MenuBarExtra.Item
            title={`Sched. Arrival: ${formatTime(scheduledArrival, route?.arrTz)}${schedule?.arrDelayed ? " (delayed)" : ""}`}
          />
        )}
        {faStatus?.status && (
          <MenuBarExtra.Item title={`FA Status: ${faStatus.status}`} />
        )}
        {faStatus?.progressPercent != null && (
          <MenuBarExtra.Item title={`Progress: ${faStatus.progressPercent}%`} />
        )}
        {schedule?.depGate && (
          <MenuBarExtra.Item title={`Dep Gate: ${schedule.depGate}`} />
        )}
        {(faStatus?.terminalDestination || schedule?.arrTerminal) && (
          <MenuBarExtra.Item
            title={`Arr Terminal: ${faStatus?.terminalDestination ?? schedule?.arrTerminal}`}
          />
        )}
        {(faStatus?.gateDestination || schedule?.arrGate) && (
          <MenuBarExtra.Item
            title={`Arr Gate: ${faStatus?.gateDestination ?? schedule?.arrGate}`}
          />
        )}
        {(faStatus?.baggageClaim || schedule?.arrBaggage) && (
          <MenuBarExtra.Item
            title={`Baggage: ${faStatus?.baggageClaim ?? schedule?.arrBaggage}`}
          />
        )}
        {lastUpdated && (
          <MenuBarExtra.Item
            title={`Last Updated: ${formatTime(new Date(lastUpdated))}`}
          />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          onAction={async () => {
            // Don't reset the mutex: if a fetch is already in flight, let it
            // finish instead of starting a second concurrent cycle (which would
            // duplicate the rate-limited OpenSky and paid FlightAware calls).
            await fetchData();
          }}
        />
        <MenuBarExtra.Item
          title="View on FlightRadar24"
          onAction={() => open(flightradar24Url)}
        />
        <MenuBarExtra.Item
          title="View on FlightAware"
          onAction={() =>
            open(`https://www.flightaware.com/live/flight/${icaoCallsign}`)
          }
        />
        <MenuBarExtra.Item
          title="Stop Tracking"
          onAction={async () => {
            await clearFlight();
            cache.clear();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
