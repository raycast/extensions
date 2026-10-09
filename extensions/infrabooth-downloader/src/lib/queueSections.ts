import type { RemoteState, RemoteTrack } from "@/lib/remote-protocol";

export interface QueueEntry {
  track: RemoteTrack;
  index: number;
}

export interface QueueSection {
  title: string;
  entries: QueueEntry[];
}

export interface QueueSections {
  history: QueueEntry[];
  upcoming: QueueSection[];
}

function entriesBetween(queue: RemoteTrack[], start: number, end: number): QueueEntry[] {
  return queue.slice(start, end).map((track, offset) => ({ track, index: start + offset }));
}

export function buildQueueSections({ queue, cursor, manualQueueCount, stationQueueCount }: RemoteState): QueueSections {
  const firstUpcoming = Math.min(Math.max(cursor + 1, 0), queue.length);
  const manualEnd = Math.min(firstUpcoming + Math.max(manualQueueCount, 0), queue.length);
  const stationStart =
    stationQueueCount > 0
      ? Math.min(Math.max(queue.length - stationQueueCount, manualEnd), queue.length)
      : queue.length;

  const upcoming: QueueSection[] = [
    { title: "Next up", entries: entriesBetween(queue, firstUpcoming, manualEnd) },
    { title: "Queue", entries: entriesBetween(queue, manualEnd, stationStart) },
    { title: "Autoplay Station", entries: entriesBetween(queue, stationStart, queue.length) },
  ];

  return {
    history: entriesBetween(queue, 0, Math.max(cursor, 0)),
    upcoming: upcoming.filter((section) => section.entries.length > 0),
  };
}
