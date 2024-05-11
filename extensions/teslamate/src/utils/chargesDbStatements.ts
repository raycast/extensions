const getChargesInfo =
  "SELECT start_date, end_date, charge_energy_added, start_battery_level, end_battery_level, duration_min, position_id, start_rated_range_km, end_rated_range_km, outside_temp_avg, p.latitude, p.longitude FROM charging_processes cp JOIN positions p ON cp.position_id = p.id WHERE cp.car_id = 1 ORDER BY start_date DESC LIMIT 50";

const getPrefeeredUnits = "SELECT unit_of_length, unit_of_temperature FROM settings";

export const chargingQueryObject = [
  { rawSql: getChargesInfo, refId: "charges_info" },
  { rawSql: getPrefeeredUnits, refId: "car_units" },
];
