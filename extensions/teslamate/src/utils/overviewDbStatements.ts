const getCarDataSql = "SELECT id, model, name, vin, exterior_color, marketing_name FROM cars;";

const getCarVersionSql = "SELECT version FROM updates WHERE car_id = '1' ORDER BY start_date DESC LIMIT 1;";

const getCarState = "SELECT start_date, state FROM states WHERE car_id = '1' ORDER BY start_date DESC LIMIT 1;";

const getCarInfoPositionsTable =
  "SELECT  odometer::numeric, battery_level, inside_temp, outside_temp, is_climate_on, rated_battery_range_km, tpms_pressure_rr, tpms_pressure_rl, tpms_pressure_fr, tpms_pressure_fl FROM positions WHERE car_id = '1' ORDER BY date DESC LIMIT 1;";

const getPrefeeredUnits = "SELECT unit_of_length, unit_of_temperature FROM settings";

export const overviewQueryObjects = [
  { rawSql: getCarDataSql, refId: "car_info" },
  { rawSql: getCarVersionSql, refId: "car_version" },
  { rawSql: getCarState, refId: "car_state" },
  { rawSql: getCarInfoPositionsTable, refId: "car_info_positions_table" },
  { rawSql: getPrefeeredUnits, refId: "car_units" },
];
