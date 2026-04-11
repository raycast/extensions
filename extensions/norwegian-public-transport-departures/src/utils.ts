export const TRANSPORT_ICONS: Record<string, string> = {
  bus: "🚌",
  rail: "🚆",
  tram: "🚊",
  metro: "🚇",
  water: "⛴",
  air: "✈️",
  coach: "🚍",
  funicular: "🚡",
  cableway: "🚠",
};

export function transportIcon(mode: string): string {
  return TRANSPORT_ICONS[mode?.toLowerCase()] ?? "🚌";
}

const TRANSPORT_LABELS: Record<string, string> = {
  bus: "Bus",
  rail: "Train",
  tram: "Tram",
  metro: "T-bane",
  water: "Ferry",
  air: "Air",
  coach: "Coach",
  funicular: "Funicular",
  cableway: "Cableway",
};

export function transportLabel(mode: string): string {
  return TRANSPORT_LABELS[mode?.toLowerCase()] ?? mode;
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function minutesUntil(isoString: string): number {
  const diff = new Date(isoString).getTime() - Date.now();
  return Math.round(diff / 60000);
}

export function formatCountdown(isoString: string): string {
  const mins = minutesUntil(isoString);
  if (mins <= 0) return "now";
  if (mins === 1) return "1 min";
  return `${mins} min`;
}

export function groupByLine(
  departures: Array<{
    serviceJourney: { line: { publicCode: string; transportMode: string } };
  }>,
) {
  const groups = new Map<string, typeof departures>();
  for (const dep of departures) {
    const key = dep.serviceJourney.line.publicCode;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(dep);
  }
  return groups;
}
