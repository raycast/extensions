export interface ChargingSession {
  startDate: string;
  endDate: string;
  chargeEnergyAdded: string;
  startBatteryLevel: string;
  endBatteryLevel: string;
  durationMin: string;
  positionId: string;
  startRatedRangeKm: string;
  endRatedRangeKm: string;
  addedRangeKm: string;
  outsideTempAvg: string;
  latitude: string;
  longitude: string;
  lengthUnit: string;
  temperatureUnit: string;
}
