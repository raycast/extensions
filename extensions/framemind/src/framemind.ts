import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const runFile = promisify(execFile);

export type AssetRow = {
  assetID: string;
  filename: string;
  score?: number;
};

type Envelope = {
  ok: boolean;
  status: string;
  message: string;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
};

export async function framemind(args: string[]): Promise<Envelope> {
  const { cliPath } = getPreferenceValues<{ cliPath: string }>();
  const { stdout } = await runFile(
    cliPath,
    ["--json", "--wait", "12", ...args],
    {
      timeout: 15_000,
      maxBuffer: 2_000_000,
      env: {
        ...process.env,
        PATH: "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin",
      },
    },
  );
  const response = JSON.parse(stdout) as Envelope;
  if (!response.ok)
    throw new Error(response.error?.message ?? response.message);
  return response;
}

export function rows(envelope: Envelope): AssetRow[] {
  const value = envelope.data?.results;
  return Array.isArray(value) ? (value as AssetRow[]) : [];
}
