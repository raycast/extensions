import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import moment from "moment";
import { Distance } from "./types/Distance";
import { Info } from "./types/Info";
import { TirePressures } from "./types/TirePressures";
import { BASE_URL } from "./utils/constants";
import { getDistance } from "./utils/utils";

type TemperatureType = "fahrenheit" | "celsius";

const tempConversion = (celsius: number, tempType: TemperatureType): number =>
  tempType === "fahrenheit" ? Math.round((celsius * 9) / 5 + 32) : Math.round(celsius);

const boolToString = (value: boolean): string => (value ? "On" : "Off");

const formatCarModelName = (modelName: string): string => {
  modelName = modelName.replace(/([0-9]+)/, " $1");
  return modelName.charAt(0).toUpperCase() + modelName.slice(1);
};

export default function CarStatus() {
  const preferences = getPreferenceValues<{
    tessieApiKey: string;
    VIN: string;
    temperature: TemperatureType;
    distance: Distance;
  }>();

  const API_KEY = preferences.tessieApiKey;
  const VIN = preferences.VIN;
  const tempType = preferences.temperature;
  const distanceType = preferences.distance;
  const tempUnit = tempType === "fahrenheit" ? "°F" : "°C";

  const headers = { Authorization: `Bearer ${API_KEY}` };

  const { isLoading, data } = useFetch<Info>(`${BASE_URL}/${VIN}/state`, { headers });
  const { data: tires } = useFetch<TirePressures>(`${BASE_URL}/${VIN}/tire_pressure`, { headers });

  if (isLoading && !data) return <List isLoading={true} />;
  if (!data) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Failed to fetch your car data" />
      </List>
    );
  }

  // Top-level vehicle state: online / asleep / offline
  const status = data.state.charAt(0).toUpperCase() + data.state.slice(1);
  const statusColor = status === "Online" ? Color.Green : status === "Asleep" ? Color.Blue : Color.SecondaryText;

  // Activity from the gear selector
  const shift = data.drive_state?.shift_state;
  const speed = data.drive_state?.speed;
  const gearMap: Record<string, string> = { P: "Parked", R: "Reverse", N: "Neutral", D: "Driving" };
  let activity = "Parked";
  if (shift && gearMap[shift]) {
    activity = gearMap[shift];
    if ((shift === "D" || shift === "R") && speed != null) {
      const speedLabel = distanceType === "miles" ? "mph" : "km/h";
      activity += ` — ${Math.round(getDistance(speed, distanceType))} ${speedLabel}`;
    }
  }

  // Charging
  const cs = data.charge_state;
  const chargeState = cs.charging_state;
  const isCharging = chargeState === "Charging";
  const chargeColor = isCharging ? Color.Green : Color.SecondaryText;

  // Climate
  const inside = data.climate_state.inside_temp;
  const outside = data.climate_state.outside_temp;

  // Openings (0 = closed)
  const vs = data.vehicle_state;
  const open: string[] = [];
  if (vs.df || vs.dr || vs.pf || vs.pr) open.push("doors");
  if (vs.fd_window || vs.fp_window || vs.rd_window || vs.rp_window) open.push("windows");
  if (vs.ft) open.push("frunk");
  if (vs.rt) open.push("trunk");
  const openings = open.length ? `Open: ${open.join(", ")}` : "All closed";

  // Software update
  const version = vs.car_version?.split(" ")[0] ?? "Unknown";
  const updateStatus = vs.software_update?.status;
  const updateAvailable = !!updateStatus && updateStatus !== "";

  // Tires (bar -> PSI)
  const toPsi = (bar: number) => `${Math.round(bar * 14.5038)} PSI`;

  const lastUpdated = cs.timestamp ? moment(cs.timestamp).fromNow() : "Unknown";

  const odometer = `${getDistance(vs.odometer, distanceType).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} ${distanceType}`;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${data.display_name} — ${formatCarModelName(data.vehicle_config.car_type)}`}
      searchBarPlaceholder="Filter status…"
    >
      <List.Section title="Overview">
        <List.Item
          icon={{ source: Icon.Dot, tintColor: statusColor }}
          title="Status"
          accessories={[{ tag: { value: status, color: statusColor } }]}
        />
        <List.Item icon={Icon.Car} title="Activity" accessories={[{ text: activity }]} />
        <List.Item icon={Icon.Gauge} title="Odometer" accessories={[{ text: odometer }]} />
      </List.Section>

      <List.Section title="Battery & Charging">
        <List.Item
          icon={{ source: Icon.Battery, tintColor: isCharging ? Color.Green : undefined }}
          title="Battery"
          accessories={[{ text: `${cs.battery_level}% (${cs.usable_battery_level}% usable)` }]}
        />
        <List.Item
          icon={Icon.Gauge}
          title="Range"
          accessories={[{ text: `${getDistance(cs.battery_range, distanceType).toFixed(0)} ${distanceType}` }]}
        />
        <List.Item
          icon={{ source: Icon.Bolt, tintColor: isCharging ? Color.Green : undefined }}
          title="Charging"
          accessories={[{ tag: { value: chargeState, color: chargeColor } }]}
        />
        {isCharging && (
          <List.Item icon={Icon.Plug} title="Charge Rate" accessories={[{ text: `${cs.charger_power} kW` }]} />
        )}
        {isCharging && cs.charger_actual_current > 0 && (
          <List.Item icon={Icon.Bolt} title="Current" accessories={[{ text: `${cs.charger_actual_current} A` }]} />
        )}
        {isCharging && cs.charge_energy_added > 0 && (
          <List.Item
            icon={Icon.PlusCircle}
            title="Energy Added"
            accessories={[{ text: `${cs.charge_energy_added} kWh` }]}
          />
        )}
        {isCharging && cs.minutes_to_full_charge > 0 && (
          <List.Item
            icon={Icon.Clock}
            title="Time to Full"
            accessories={[
              { text: `${Math.floor(cs.minutes_to_full_charge / 60)}h ${cs.minutes_to_full_charge % 60}m` },
            ]}
          />
        )}
        <List.Item icon={Icon.Flag} title="Charge Limit" accessories={[{ text: `${cs.charge_limit_soc}%` }]} />
      </List.Section>

      <List.Section title="Climate">
        <List.Item
          icon={Icon.Temperature}
          title="Climate"
          accessories={[
            {
              tag: {
                value: boolToString(data.climate_state.is_climate_on),
                color: data.climate_state.is_climate_on ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
        />
        {inside != null && (
          <List.Item
            icon={Icon.House}
            title="Inside"
            accessories={[{ text: `${tempConversion(inside, tempType)}${tempUnit}` }]}
          />
        )}
        {outside != null && (
          <List.Item
            icon={Icon.Sun}
            title="Outside"
            accessories={[{ text: `${tempConversion(outside, tempType)}${tempUnit}` }]}
          />
        )}
      </List.Section>

      <List.Section title="Security">
        <List.Item
          icon={vs.locked ? Icon.Lock : Icon.LockUnlocked}
          title="Lock"
          accessories={[
            { tag: { value: vs.locked ? "Locked" : "Unlocked", color: vs.locked ? Color.Green : Color.Red } },
          ]}
        />
        <List.Item
          icon={Icon.Eye}
          title="Sentry Mode"
          accessories={[
            {
              tag: {
                value: boolToString(vs.sentry_mode),
                color: vs.sentry_mode ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
        />
        <List.Item
          icon={open.length ? Icon.ExclamationMark : Icon.CheckCircle}
          title="Openings"
          accessories={[{ text: openings }]}
        />
      </List.Section>

      <List.Section title="Tires">
        {tires ? (
          <>
            <List.Item
              icon={Icon.CircleProgress100}
              title="Front Left"
              accessories={[{ text: toPsi(tires.front_left) }]}
            />
            <List.Item
              icon={Icon.CircleProgress100}
              title="Front Right"
              accessories={[{ text: toPsi(tires.front_right) }]}
            />
            <List.Item
              icon={Icon.CircleProgress100}
              title="Rear Left"
              accessories={[{ text: toPsi(tires.rear_left) }]}
            />
            <List.Item
              icon={Icon.CircleProgress100}
              title="Rear Right"
              accessories={[{ text: toPsi(tires.rear_right) }]}
            />
          </>
        ) : (
          <List.Item icon={Icon.CircleProgress100} title="Tire Pressure" accessories={[{ text: "Unavailable" }]} />
        )}
      </List.Section>

      <List.Section title="System">
        <List.Item
          icon={Icon.ComputerChip}
          title="Software"
          accessories={[
            { text: `v${version}` },
            ...(updateAvailable ? [{ tag: { value: `Update: ${updateStatus}`, color: Color.Orange } }] : []),
          ]}
        />
        <List.Item icon={Icon.Clock} title="Last Updated" accessories={[{ text: lastUpdated }]} />
      </List.Section>
    </List>
  );
}
