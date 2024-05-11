export interface ChargingSession {
  startDate: string;
  endDate: string;
  chargeEnergyAdded: string;
  startBatteryLevel: string;
  endBatteryLevel: string;
  durationMin: number;
  positionId: string;
  startRatedRangeKm: string;
  endRatedRangeKm: string;
  addedRangeKm: string;
  outsideTempAvg: string;
  latitude: number;
  longitude: number;
  lengthUnit: string;
  temperatureUnit: string;
}
