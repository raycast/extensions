export function handleChargeSessionObject(chargingResponseData: object) {
  const chargingResponseDataWithResults = chargingResponseData as {
    results: {
      charges_info: {
        frames: {
          data: {
            values: object[];
          };
        }[];
      };
      car_units: {
        frames: {
          data: {
            values: object[];
          };
        }[];
      };
    };
  };

  const [
    start_date,
    end_date,
    charge_energy_added,
    start_battery_level,
    end_battery_level,
    duration_min,
    position_id,
    start_rated_range_km,
    end_rated_range_km,
    outside_temp_avg,
    latitude,
    longitude,
  ] = chargingResponseDataWithResults.results.charges_info.frames[0].data.values;

  const carUnits = chargingResponseDataWithResults.results.car_units.frames[0].data.values;
  const [lengthUnit, temperatureUnit] = carUnits;

  const chargingSessionsObject = (start_date as string[]).map((start_date: string, index: number) => ({
    startDate: new Date(start_date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }),

    endDate: new Date((end_date as string[])[index]).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }),
    chargeEnergyAdded: (charge_energy_added as string[])[index].toString(),
    startBatteryLevel: (start_battery_level as string[])[index].toString(),
    endBatteryLevel: (end_battery_level as string[])[index].toString(),
    durationMin: (duration_min as number[])[index].toString(),
    positionId: (position_id as number[])[index].toString(),
    startRatedRangeKm: (start_rated_range_km as string[])[index].toString(),
    endRatedRangeKm: (end_rated_range_km as string[])[index].toString(),
    addedRangeKm: Math.floor(
      (end_rated_range_km as number[])[index] - (start_rated_range_km as number[])[index],
    ).toString(),
    outsideTempAvg: (outside_temp_avg as string[])[index].toString(),
    latitude: (latitude as string[])[index].toString(),
    longitude: (longitude as string[])[index].toString(),

    lengthUnit: lengthUnit.toString(),
    temperatureUnit: temperatureUnit.toString(),
  }));

  return chargingSessionsObject;
}

// endDate: new Date(end_date[index]).toLocaleString(),
// chargeEnergyAdded: charge_energy_added[index].toString(),
// startBatteryLevel: start_battery_level[index].toString(),
// endBatteryLevel: end_battery_level[index].toString(),
// durationMin: duration_min[index].toString(),
// positionId: position_id[index].toString(),
// startRatedRangeKm: start_rated_range_km[index].toString(),
// endRatedRangeKm: end_rated_range_km[index].toString(),
// addedRangeKm: Math.floor(end_rated_range_km[index] - start_rated_range_km[index]).toString(),
// outsideTempAvg: outside_temp_avg[index].toString(),
// latitude: latitude[index].toString(),
// longitude: longitude[index].toString(),
