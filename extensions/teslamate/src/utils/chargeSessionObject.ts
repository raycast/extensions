export function handleChargeSessionObject(chargingResponseData: object) {
  const chargingResponseDataWithResults = chargingResponseData as {
    results: {
      charges_info: {
        frames: {
          data: {
            values: any[];
          };
        }[];
      };
      car_units: {
        frames: {
          data: {
            values: any[];
          };
        }[];
      };
    };
  };

  const start_date = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[0];
  const end_date = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[1];
  const charge_energy_added = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[2];
  const start_battery_level = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[3];
  const end_battery_level = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[4];
  const duration_min = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[5];
  const position_id = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[6];
  const start_rated_range_km = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[7];
  const end_rated_range_km = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[8];
  const outside_temp_avg = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[9];
  const latitude = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[10];
  const longitude = chargingResponseDataWithResults.results.charges_info.frames[0].data.values[11];

  const carUnits = chargingResponseDataWithResults.results.car_units.frames[0].data.values;
  const [lengthUnit, temperatureUnit] = carUnits;

  const chargingSessionsObject = start_date.map((start_date: number, index: number) => ({
    startDate: new Date(start_date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }),
    endDate: new Date(end_date[index]).toLocaleString(),
    chargeEnergyAdded: charge_energy_added[index].toString(),
    startBatteryLevel: start_battery_level[index].toString(),
    endBatteryLevel: end_battery_level[index].toString(),
    durationMin: duration_min[index].toString(),
    positionId: position_id[index].toString(),
    startRatedRangeKm: start_rated_range_km[index].toString(),
    endRatedRangeKm: end_rated_range_km[index].toString(),
    addedRangeKm: Math.floor(end_rated_range_km[index] - start_rated_range_km[index]).toString(),
    outsideTempAvg: outside_temp_avg[index].toString(),
    latitude: latitude[index],
    longitude: longitude[index],
    lengthUnit: lengthUnit,
    temperatureUnit: temperatureUnit,
  }));

  return chargingSessionsObject;
}
