import { useEffect, useRef } from "react";
import { Color, Icon, Image, LocalStorage } from "@raycast/api";
import { DeploymentGQL, DeploymentStatus, LogType } from "./railway";

// Shared by Search Projects and the menu bar, which follows starred projects
export const starredProjectsStorageKey = "starred-projects";

// Reads what `useLocalStorage` wrote (a JSON string) without the hook's extra loading state
export const readStarredProjectIds = async (): Promise<string[]> => {
  const item = await LocalStorage.getItem<string>(starredProjectsStorageKey);
  try {
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
};

interface StatusDisplay {
  label: string;
  color: Color;
  icon: Icon;
}

const statusDisplay: Record<DeploymentStatus, StatusDisplay> = {
  SUCCESS: { label: "Active", color: Color.Green, icon: Icon.CheckCircle },
  BUILDING: { label: "Building", color: Color.Blue, icon: Icon.Hammer },
  DEPLOYING: { label: "Deploying", color: Color.Blue, icon: Icon.CircleProgress50 },
  INITIALIZING: { label: "Initializing", color: Color.Blue, icon: Icon.CircleProgress25 },
  QUEUED: { label: "Queued", color: Color.SecondaryText, icon: Icon.Clock },
  WAITING: { label: "Waiting", color: Color.SecondaryText, icon: Icon.Clock },
  NEEDS_APPROVAL: { label: "Needs Approval", color: Color.Yellow, icon: Icon.QuestionMarkCircle },
  FAILED: { label: "Failed", color: Color.Red, icon: Icon.XMarkCircle },
  CRASHED: { label: "Crashed", color: Color.Red, icon: Icon.ExclamationMark },
  SLEEPING: { label: "Sleeping", color: Color.Purple, icon: Icon.Moon },
  REMOVING: { label: "Removing", color: Color.SecondaryText, icon: Icon.CircleProgress75 },
  REMOVED: { label: "Removed", color: Color.SecondaryText, icon: Icon.MinusCircle },
  SKIPPED: { label: "Skipped", color: Color.SecondaryText, icon: Icon.ArrowRightCircle },
};

export const getStatusDisplay = (status: DeploymentStatus): StatusDisplay =>
  statusDisplay[status] ?? { label: status, color: Color.SecondaryText, icon: Icon.Circle };

export const statusIcon = (status: DeploymentStatus): Image.ImageLike => {
  const { icon, color } = getStatusDisplay(status);
  return { source: icon, tintColor: color };
};

const inProgressStatuses: DeploymentStatus[] = [
  "BUILDING",
  "DEPLOYING",
  "INITIALIZING",
  "QUEUED",
  "WAITING",
  "REMOVING",
];

export const isInProgress = (status: DeploymentStatus): boolean => inProgressStatuses.includes(status);

// Deployments that still have a running (or crashed) container that can be restarted or removed
export const isRunning = (status: DeploymentStatus): boolean =>
  status === "SUCCESS" || status === "CRASHED" || status === "SLEEPING";

const isBuildPhase = (status: DeploymentStatus): boolean =>
  status === "BUILDING" || status === "QUEUED" || status === "INITIALIZING" || status === "WAITING";

// Open build logs while a deployment is building or failed, since that is where the answer usually is
export const defaultLogType = (status: DeploymentStatus): LogType =>
  isBuildPhase(status) || status === "FAILED" ? "build" : "deploy";

export const deploymentTitle = (deployment: DeploymentGQL): string => {
  const meta = deployment.meta;
  const message = meta?.commitMessage?.split("\n")[0].trim();
  if (message) return message;
  if (meta?.image) return meta.image;
  if (meta?.reason) return meta.reason.charAt(0).toUpperCase() + meta.reason.slice(1);
  return "Deployment";
};

export const deploymentSubtitle = (deployment: DeploymentGQL): string | undefined => {
  const meta = deployment.meta;
  const parts = [meta?.branch, meta?.commitHash?.slice(0, 7)].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
};

export const formatTime = (timestamp: string): string =>
  new Date(timestamp).toLocaleTimeString(undefined, { hour12: false });

// Build output is full of ANSI color codes that Raycast would render as garbage
// eslint-disable-next-line no-control-regex
const ansiPattern = /\u001b\[[0-9;?]*[A-Za-z]/g;

export const stripAnsi = (text: string): string => text.replace(ansiPattern, "");

// Log attributes can be plain strings or JSON-encoded strings
export const parseAttributeValue = (value: string): string => {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
};

// Keep refreshing while a deployment is still moving, like `railway restart` waiting for it to settle
export const usePollWhile = (active: boolean, revalidate: () => void, intervalMs = 5000) => {
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => revalidateRef.current(), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
};

export const formatRelativeTime = (date: string | Date): string => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatUsd = (value: number): string => usdFormatter.format(value);

export const formatPercent = (value: number): string => `${Math.round(value)}%`;

// Same units and rounding as `railway metrics`
export const formatCpu = (value: number): string => {
  if (value === 0) return "0 vCPU";
  if (value < 0.01) return "< 0.01 vCPU";
  return `${value.toFixed(value < 1 ? 2 : 1)} vCPU`;
};

export const formatGb = (valueGb: number): string => {
  if (valueGb === 0) return "0 MB";
  if (valueGb < 0.001) return `${(valueGb * 1024).toFixed(2)} MB`;
  if (valueGb < 1) {
    const mb = valueGb * 1024;
    return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  }
  return `${valueGb.toFixed(valueGb < 10 ? 2 : 1)} GB`;
};

// Green under 60%, yellow up to 85%, red above, like the CLI
export const utilizationColor = (percent: number): Color => {
  if (percent > 85) return Color.Red;
  if (percent >= 60) return Color.Yellow;
  return Color.Green;
};

// Labels such as "< 0.01 vCPU" would otherwise make the SVG invalid
const escapeXml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface ChartPoint {
  ts: number;
  value: number;
}

// An area chart as an inline SVG image, so metrics render in a Detail view without extra files
export const chartMarkdown = (
  points: ChartPoint[],
  color: string,
  format: (value: number) => string,
  limit?: number,
): string => {
  if (points.length < 2) return "";

  const width = 640;
  const height = 180;
  const padding = 6;
  const minTs = points[0].ts;
  const tsRange = Math.max(points[points.length - 1].ts - minTs, 1);
  // Scale to the usage itself; scaling to the limit would flatten most services into a line along the bottom
  const maxValue = Math.max(...points.map((p) => p.value)) * 1.2 || 1;

  const x = (ts: number) => padding + ((ts - minTs) / tsRange) * (width - padding * 2);
  const y = (value: number) => height - padding - (value / maxValue) * (height - padding * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.ts).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points[points.length - 1].ts).toFixed(1)},${height - padding} L${x(minTs).toFixed(1)},${
    height - padding
  } Z`;
  const limitLine =
    limit && limit > 0 && limit <= maxValue
      ? `<line x1="${padding}" x2="${width - padding}" y1="${y(limit)}" y2="${y(
          limit,
        )}" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="6 4"/>`
      : "";

  // Without a scale, a steady line near the top would look like it is about to hit the limit
  const labelStyle = `font-family="-apple-system, Helvetica, sans-serif" font-size="12" fill="#9CA3AF"`;
  const labels = `<text x="${padding + 4}" y="${padding + 12}" ${labelStyle}>${escapeXml(
    format(maxValue),
  )}</text><text x="${padding + 4}" y="${height - padding - 4}" ${labelStyle}>0</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${limitLine}<path d="${area}" fill="${color}" fill-opacity="0.18"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>${labels}</svg>`;

  return `![Chart](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
};
