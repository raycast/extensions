import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { environment } from "@raycast/api";
import type { DriveNode, TransferResult } from "./cli";

/**
 * Demo mode, for store screenshots: an invented Drive generated locally instead of calling the CLI.
 * Only available in development (`npm run dev`); a published build never enters it.
 */
const FLAG_FILE = join(environment.supportPath, "demo-mode");

export function isDemo(): boolean {
  return environment.isDevelopment && existsSync(FLAG_FILE);
}

export async function setDemo(enabled: boolean): Promise<void> {
  if (enabled) {
    await mkdir(environment.supportPath, { recursive: true });
    await writeFile(FLAG_FILE, "");
  } else {
    await rm(FLAG_FILE, { force: true });
  }
}

type Spec = { name: string; children?: Spec[]; type?: string; size?: number; modified?: string; link?: boolean };

const pdf = "application/pdf";
const jpg = "image/jpeg";
const png = "image/png";
const doc = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const xls = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const zip = "application/zip";
const mp3 = "audio/mpeg";
const mp4 = "video/mp4";

const f = (name: string, type: string, size: number, modified: string, link = false): Spec => ({
  name,
  type,
  size,
  modified,
  link,
});

const TREE: Spec[] = [
  {
    name: "Projects",
    children: [
      {
        name: "Website Redesign",
        children: [
          f("Brief.pdf", pdf, 482_113, "2026-09-12T09:14:00Z", true),
          f("Wireframes.pdf", pdf, 3_204_551, "2026-09-18T16:40:00Z"),
          f("Homepage mockup.png", png, 2_480_002, "2026-09-25T11:02:00Z"),
          f("Content plan.xlsx", xls, 58_420, "2026-09-20T08:31:00Z"),
        ],
      },
      {
        name: "Brand Identity",
        children: [
          f("Logo final.png", png, 312_880, "2026-06-02T14:20:00Z", true),
          f("Brand guidelines.pdf", pdf, 8_740_120, "2026-06-10T10:05:00Z"),
          f("Fonts.zip", zip, 1_920_400, "2026-05-28T17:45:00Z"),
        ],
      },
      f("Roadmap 2027.docx", doc, 74_310, "2026-09-29T15:12:00Z"),
      f("Meeting notes.docx", doc, 22_640, "2026-09-30T09:48:00Z"),
    ],
  },
  {
    name: "Invoices",
    children: [
      {
        name: "2025",
        children: Array.from({ length: 6 }, (_, i) =>
          f(
            `Invoice 2025-${String(i + 1).padStart(2, "0")}.pdf`,
            pdf,
            90_000 + i * 3_117,
            `2025-0${i + 1}-28T10:00:00Z`,
          ),
        ),
      },
      {
        name: "2026",
        children: Array.from({ length: 9 }, (_, i) =>
          f(
            `Invoice 2026-${String(i + 1).padStart(2, "0")}.pdf`,
            pdf,
            92_000 + i * 2_903,
            `2026-0${i + 1}-28T10:00:00Z`,
          ),
        ),
      },
      f("Expenses 2026.xlsx", xls, 41_208, "2026-09-28T18:22:00Z"),
    ],
  },
  {
    name: "Photos",
    children: [
      {
        name: "Summer in Lisbon",
        children: Array.from({ length: 12 }, (_, i) =>
          f(`IMG_${4210 + i}.jpg`, jpg, 3_100_000 + i * 87_331, `2026-07-${String(10 + i).padStart(2, "0")}T19:30:00Z`),
        ),
      },
      f("Family dinner.mp4", mp4, 184_320_000, "2026-08-15T21:10:00Z", true),
    ],
  },
  {
    name: "Documents",
    children: [
      f("Lease agreement.pdf", pdf, 1_240_880, "2025-11-03T12:00:00Z"),
      f("Insurance certificate.pdf", pdf, 310_442, "2026-01-15T09:30:00Z"),
      f("Resume.pdf", pdf, 128_004, "2026-09-02T08:15:00Z", true),
      f("Tax return 2025.pdf", pdf, 2_048_310, "2026-05-20T16:45:00Z"),
    ],
  },
  {
    name: "Music",
    children: [
      f("Demo track.mp3", mp3, 7_840_220, "2026-04-11T22:05:00Z"),
      f("Rehearsal.mp3", mp3, 12_300_000, "2026-04-18T20:40:00Z"),
    ],
  },
  f("Welcome to Proton Drive.pdf", pdf, 1_004_220, "2026-01-02T10:00:00Z"),
];

function find(path: string): Spec[] | undefined {
  const parts = path
    .replace(/^\/my-files\/?/, "")
    .split("/")
    .filter(Boolean);
  let level: Spec[] | undefined = TREE;
  for (const part of parts) level = level?.find((s) => s.name === part)?.children;
  return level;
}

function latest(spec: Spec): string {
  if (!spec.children) return spec.modified!;
  return spec.children.map(latest).sort().at(-1) ?? "2026-01-01T00:00:00Z";
}

function toNode(spec: Spec, parentPath: string): DriveNode {
  const path = `${parentPath}/${spec.name}`;
  const folder = Boolean(spec.children);
  return {
    uid: `demo:${path}`,
    name: spec.name,
    path,
    parentPath,
    type: folder ? "folder" : "file",
    mediaType: spec.type,
    size: spec.size,
    modified: folder ? latest(spec) : spec.modified,
    created: "2025-01-06T09:00:00Z",
    shared: Boolean(spec.link),
    sharedByUrl: Boolean(spec.link),
  };
}

/** Same latency feel as the CLI, so screenshots show realistic loading states. */
const pause = () => new Promise((r) => setTimeout(r, 400));

export async function demoList(path: string): Promise<DriveNode[]> {
  await pause();
  const children = find(path);
  if (!children) throw new Error(`Demo: no folder at ${path}`);
  return children.map((c) => toNode(c, path.replace(/\/$/, "")));
}

/** Writes placeholder files so Open and Download work end to end. */
export async function demoDownload(paths: string[], localFolder: string): Promise<TransferResult> {
  await pause();
  for (const p of paths) await writeFile(join(localFolder, basename(p)), "Proton Drive for Raycast — demo file\n");
  return { transferredItems: paths.length, skippedItems: 0, failedItems: 0, failures: [] };
}

export async function demoUpload(localPaths: string[]): Promise<TransferResult> {
  await pause();
  return { transferredItems: localPaths.length, skippedItems: 0, failedItems: 0, failures: [] };
}

export function demoLink(path: string): string {
  return `https://drive.proton.me/urls/DEMO${Buffer.from(path).toString("base64url").slice(0, 10)}#demo`;
}
