import { execFile } from "child_process";
import { promisify } from "util";
import { AUDIO_FORMAT_BIN } from "./paths";

const execFileP = promisify(execFile);

export interface AudioFormat {
  rate: number;
  bits: number;
  isFloat: boolean;
  isCurrent: boolean;
  label: string;
}

export interface CurrentFormat {
  device: string;
  label: string;
}

interface CliItem {
  uid?: string;
  title?: string;
  subtitle?: string;
  arg?: string;
  valid?: boolean;
}

export function parseListOutput(stdout: string): AudioFormat[] {
  const parsed = JSON.parse(stdout) as { items?: CliItem[] };
  const items = parsed.items ?? [];
  const formats: AudioFormat[] = [];
  for (const item of items) {
    if (item.valid === false) continue;
    if (!item.arg || !item.title) continue;
    const argParts = item.arg.split(" ");
    if (argParts.length < 3) continue;
    const rate = Number(argParts[0]);
    const bits = Number(argParts[1]);
    if (!Number.isFinite(rate) || !Number.isFinite(bits)) continue;
    const isFloat = argParts[2] === "float";
    const isCurrent = item.title.startsWith("✓ ");
    const label = item.title.replace(/^✓\s*/, "");
    formats.push({ rate, bits, isFloat, isCurrent, label });
  }
  return formats;
}

export function parseCurrentOutput(stdout: string): CurrentFormat | null {
  const trimmed = stdout.trim();
  const m = /^(.+?):\s+(.+)$/.exec(trimmed);
  if (!m) return null;
  return { device: m[1], label: m[2] };
}

export function formatToCliArg(fmt: {
  rate: number;
  bits: number;
  isFloat: boolean;
}): string[] {
  return [
    "set",
    String(fmt.rate),
    String(fmt.bits),
    fmt.isFloat ? "float" : "int",
  ];
}

export async function listFormats(): Promise<AudioFormat[]> {
  const { stdout } = await execFileP(AUDIO_FORMAT_BIN, ["list"]);
  return parseListOutput(stdout);
}

export async function getCurrentFormat(): Promise<CurrentFormat | null> {
  try {
    const { stdout } = await execFileP(AUDIO_FORMAT_BIN, ["current"]);
    return parseCurrentOutput(stdout);
  } catch {
    return null;
  }
}

export async function setFormat(fmt: {
  rate: number;
  bits: number;
  isFloat: boolean;
}): Promise<void> {
  await execFileP(AUDIO_FORMAT_BIN, formatToCliArg(fmt));
}
