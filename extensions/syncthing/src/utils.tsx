export function truncateDeviceID(deviceID: string): string {
  return deviceID.slice(0, 5);
}

export function timestampToReadableTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return date.toLocaleString("en-US");
}
