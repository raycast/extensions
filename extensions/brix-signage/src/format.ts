import { Color, Icon, Image } from "@raycast/api";
import { CONTENT_KIND_LABEL, MediaFile, Screen } from "./types";

export function statusIcon(screen: Screen): Image.ImageLike {
  if (screen.deactivatedAt) return { source: Icon.CircleDisabled, tintColor: Color.SecondaryText };
  switch (screen.status) {
    case "online":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "offline":
      return { source: Icon.CircleFilled, tintColor: Color.Red };
    default:
      return { source: Icon.CircleProgress, tintColor: Color.Yellow };
  }
}

export function statusText(screen: Screen): string {
  if (screen.deactivatedAt) return "Turned off in Brix";
  if (screen.status === "pairing") return "Not paired";
  if (screen.status === "online") return "Online";
  return screen.lastSeenAt ? `Offline since ${relative(screen.lastSeenAt)}` : "Offline";
}

export function contentText(screen: Screen): string | null {
  if (screen.emergencyHeadline) return `Emergency: ${screen.emergencyHeadline}`;
  if (screen.castHeadline) return `Message: ${screen.castHeadline}`;
  if (!screen.contentKind) return null;
  const kind = CONTENT_KIND_LABEL[screen.contentKind] ?? screen.contentKind;
  return screen.contentName ? `${kind}: ${screen.contentName}` : kind;
}

export function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function bytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function duration(sec: number | null): string | null {
  if (!sec) return null;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s} s`;
}

export function fileIcon(file: MediaFile): Image.ImageLike {
  switch (file.kind) {
    case "image":
      return Icon.Image;
    case "video":
      return Icon.Video;
    case "audio":
      return Icon.Music;
    case "pdf":
    case "powerpoint":
      return Icon.Document;
    case "web":
    case "dashboard":
      return Icon.Globe;
    case "font":
      return Icon.Text;
    default:
      return Icon.AppWindowGrid2x2;
  }
}

export const FILE_KINDS: { value: string; title: string }[] = [
  { value: "", title: "All Files" },
  { value: "image", title: "Images" },
  { value: "video", title: "Videos" },
  { value: "pdf", title: "PDFs" },
  { value: "powerpoint", title: "Slides" },
  { value: "web", title: "Web Pages" },
  { value: "audio", title: "Audio" },
];

export function kindTitle(kind: string): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1).replace(/-/g, " ");
}
