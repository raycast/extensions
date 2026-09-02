export enum SignalStrength {
  Poor = 1,
  Fair = 2,
  Good = 3,
  Excellent = 4,
}

export function rssiToSignalStrength(rssi: number): SignalStrength {
  return Math.ceil((Math.max(Math.min(rssi, -1), -99) + 100) / 25);
}
