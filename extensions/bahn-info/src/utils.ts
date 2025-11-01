export function getTimeUntilArrival(timestamp: number | null): string {
  if (!timestamp) return "";

  const now = new Date();
  const arrivalTime = new Date(timestamp);
  const diffMs = arrivalTime.getTime() - now.getTime();

  // If arrival time is in the past, return empty string
  if (diffMs <= 0) return "";

  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `in ${diffMinutes}m`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `in ${hours}h ${minutes}m` : `in ${hours}h`;
  }
}

export function getTimeUntilDeparture(timestamp: number | null): string {
  if (!timestamp) return "";

  const now = new Date();
  const departureTime = new Date(timestamp);
  const diffMs = departureTime.getTime() - now.getTime();

  // If departure time is in the past, return empty string
  if (diffMs <= 0) return "";

  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `in ${diffMinutes}m`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `in ${hours}h ${minutes}m` : `in ${hours}h`;
  }
}
