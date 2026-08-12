import { getDepartures } from "../api";

type Input = {
  /**
   * The stop ID for the station to check departures from.
   * Use search-stops first to find the stop ID.
   */
  stopId: string;

  /**
   * The name of the station (for display purposes)
   */
  stationName: string;
};

/**
 * Get upcoming train, metro, and light rail departures from a station.
 * Shows real-time delays and platform information.
 * Use this to check if trains are running on time or delayed.
 */
export default async function tool(input: Input) {
  const departures = await getDepartures(input.stopId);

  if (departures.length === 0) {
    return {
      stationName: input.stationName,
      message: "No upcoming train, metro, or light rail departures found.",
      departures: [],
    };
  }

  // Summarize delays
  const delayed = departures.filter((d) => d.delayMinutes > 0);
  const onTime = departures.filter((d) => d.delayMinutes === 0);
  const early = departures.filter((d) => d.delayMinutes < 0);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return {
    stationName: input.stationName,
    summary: {
      total: departures.length,
      onTime: onTime.length,
      delayed: delayed.length,
      early: early.length,
      averageDelayMinutes:
        delayed.length > 0 ? Math.round(delayed.reduce((sum, d) => sum + d.delayMinutes, 0) / delayed.length) : 0,
    },
    departures: departures.slice(0, 10).map((d) => ({
      line: d.line,
      destination: d.destination,
      scheduledTime: formatTime(d.plannedTime),
      platform: d.platform ? `Platform ${d.platform}` : undefined,
      status:
        d.delayMinutes > 0
          ? `${d.delayMinutes} min late`
          : d.delayMinutes < 0
            ? `${Math.abs(d.delayMinutes)} min early`
            : "On time",
      isRealtime: d.isRealtime,
    })),
  };
}
