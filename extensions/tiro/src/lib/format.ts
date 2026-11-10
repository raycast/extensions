import { Icon } from "@raycast/api";
import { Note } from "./api";

export function formatDuration(seconds: number): string | undefined {
  if (!seconds) return undefined;
  const totalMinutes = Math.max(Math.round(seconds / 60), 1);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function sourceIcon(sourceType: string): Icon {
  switch (sourceType) {
    case "live-voice":
      return Icon.Microphone;
    case "offline-mode":
    case "recording":
      return Icon.Waveform;
    case "video":
      return Icon.Video;
    case "webpage":
      return Icon.Globe;
    default:
      return Icon.Document;
  }
}

export function peopleNames(note: Note): string[] {
  const names = note.participants.map((person) => person.name || person.email).filter(Boolean) as string[];
  return [...new Set(names)];
}
