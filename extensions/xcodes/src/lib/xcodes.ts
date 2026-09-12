import { ensureCLI, xcodesCLIFilepath } from "./cli";
import { execp, ExecError, ExecResult } from "./utilities";

export interface XcodeDistribution {
  version: string;
  build: string;
  installed: boolean;
  selected: boolean;
}

async function execXcodes(cmd: string, cancel?: AbortController): Promise<ExecResult> {
  try {
    await ensureCLI();
    return await execp(`"${xcodesCLIFilepath()}" ${cmd}`, { signal: cancel?.signal });
  } catch (err) {
    throw err as ExecError;
  }
}

export async function xcodesList(): Promise<XcodeDistribution[]> {
  const result = await execXcodes(`list`);

  const lines = result.stdout.trim().split("\n").reverse();

  const distributions: XcodeDistribution[] = lines.reduce((acc: XcodeDistribution[], line) => {
    const matches = line.match(/(^[^(]+)\((\w+)\)( \((Installed)?,? ?(Selected)?\))?/);
    if (!matches) return acc;

    const distribution: XcodeDistribution = {
      version: matches[1].trim(),
      build: matches[2],
      installed: !!matches[3] && matches[3].includes("Installed"),
      selected: !!matches[3] && matches[3].includes("Selected"),
    };

    const key = `${distribution.version}:${distribution.build}`;
    if (!acc.some((dist) => `${dist.version}:${dist.build}` === key)) {
      acc.push(distribution);
    }

    return acc;
  }, []);

  return distributions;
}
