import { capitalize } from "./capitalize";
import moment from "moment";

export function handleCarInfoObject(carInfoResponseData: object) {
  const carInfoResponseDataTyped = carInfoResponseData as {
    results: {
      car_info: {
        frames: {
          data: {
            values: object[][];
          };
        }[];
      };
      car_version: {
        frames: {
          data: {
            values: string[];
          };
        }[];
      };
      car_state: {
        frames: {
          data: {
            values: string[][];
          };
        }[];
      };
      car_units: {
        frames: {
          data: {
            values: object[][];
          };
        }[];
      };
      car_info_positions_table: {
        frames: {
          data: {
            values: object[][];
          };
        }[];
      };
    };
  };

  const vehicleData = carInfoResponseDataTyped.results.car_info.frames[0].data.values;

  const versionData = carInfoResponseDataTyped.results.car_version.frames[0].data.values[0].toString().split(" ")[0];

  const stateData = carInfoResponseDataTyped.results.car_state.frames[0].data.values;

  const odometerData = carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[0][0];
  const formattedOdometer = odometerData.toLocaleString();

  const battery_level = parseInt(
    carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[1][0].toString(),
  );
  const rated_battery_range = parseFloat(
    carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[5][0].toString(),
  );

  const inside_temp = carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[2][0];
  const outside_temp = carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[3][0];
  const cliate_state = carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[4][0];

  const tpms_pressure_rr = carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[6][0];
  const tpms_pressure_rl = carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[7][0];
  const tpms_pressure_fr = carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[8][0];
  const tpms_pressure_fl = carInfoResponseDataTyped.results.car_info_positions_table.frames[0].data.values[9][0];

  const carUnits = carInfoResponseDataTyped.results.car_units.frames[0].data.values;
  const [lengthUnit, temperatureUnit] = carUnits;

  const carInfo = {
    id: vehicleData[0].toString(),
    model: vehicleData[1].toString(),
    name: vehicleData[2].toString(),
    vin: vehicleData[3].toString(),
    exterior_color: vehicleData[4].toString(),
    marketing_name: vehicleData[5].toString(),
    sw_version: versionData,
    state: capitalize(stateData[1].toString()),
    state_last_changed: moment(new Date(stateData[0][0]).toLocaleString(), "DDMMYYYY HH:mm:ss").fromNow(),
    odometer: formattedOdometer,
    lengthUnit: lengthUnit,
    temperatureUnit: temperatureUnit,
    batteryLevel: battery_level,
    insideTemp: inside_temp,
    outsideTemp: outside_temp,
    climate: cliate_state,
    ratedBatteryRange: rated_battery_range,
    tpmsPressureRR: tpms_pressure_rr,
    tpmsPressureRL: tpms_pressure_rl,
    tpmsPressureFR: tpms_pressure_fr,
    tpmsPressureFL: tpms_pressure_fl,
  };

  return carInfo;
}
