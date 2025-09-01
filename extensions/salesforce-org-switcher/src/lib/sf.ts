import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pexecFile = promisify(execFile);

export type Org = {
  username: string;
  alias?: string;
  orgId?: string;
  instanceUrl?: string;
  isDefault?: boolean;
  isScratch?: boolean;
};

type RawOrg = {
  username?: string;
  userName?: string;
  user?: string;
  orgUsername?: string;
  alias?: string;
  orgAlias?: string;
  instanceUrl?: string;
  instanceUrlLink?: string;
  instanceURL?: string;
  orgId?: string;
  organizationId?: string;
  isDefaultUsername?: boolean;
  isDefault?: boolean;
  defaultUsername?: boolean;
};

type SfListResult = {
  result?: {
    nonScratchOrgs?: RawOrg[];
    scratchOrgs?: RawOrg[];
  };
};

async function tryExecJson(cmd: string, args: string[]) {
  try {
    const { stdout } = await pexecFile(cmd, args, { shell: true, maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout) as SfListResult;
  } catch {
    return undefined;
  }
}

function mapOrg(o: RawOrg, isScratch: boolean): Org | undefined {
  if (!o) return undefined;
  const username: string | undefined = o.username ?? o.userName ?? o.user ?? o.orgUsername;
  if (!username) return undefined;
  const alias: string | undefined = o.alias ?? o.orgAlias;
  const instanceUrl: string | undefined = o.instanceUrl ?? o.instanceUrlLink ?? o.instanceURL;
  const orgId: string | undefined = o.orgId ?? o.organizationId;
  const isDefault: boolean = Boolean(o.isDefaultUsername ?? o.isDefault ?? o.defaultUsername);
  return { username, alias, instanceUrl, orgId, isDefault, isScratch };
}

export async function listOrgs(): Promise<Org[]> {
  // Prefer the modern `sf` CLI; fall back to legacy `sfdx` if needed.
  const tried: Array<Promise<SfListResult | undefined>> = [
    tryExecJson("sf", ["org", "list", "--json"]),
    tryExecJson("sfdx", ["force:org:list", "--json"]),
  ];

  for (const p of tried) {
    const json = await p;
    const nonScratch = json?.result?.nonScratchOrgs ?? [];
    const scratch = json?.result?.scratchOrgs ?? [];
    if ((nonScratch?.length ?? 0) + (scratch?.length ?? 0)) {
      const mapped = [
        ...nonScratch.map((o) => mapOrg(o, false)).filter(Boolean),
        ...scratch.map((o) => mapOrg(o, true)).filter(Boolean),
      ] as Org[];
      // Deduplicate by username
      const seen = new Set<string>();
      return mapped.filter((o) => {
        if (seen.has(o.username)) return false;
        seen.add(o.username);
        return true;
      });
    }
  }
  return [];
}

export async function detectCli(): Promise<"sf" | "sfdx" | null> {
  try {
    await pexecFile("sf", ["--version"], { shell: true });
    return "sf";
  } catch {
    /* ignore */
  }
  try {
    await pexecFile("sfdx", ["--version"], { shell: true });
    return "sfdx";
  } catch {
    /* ignore */
  }
  return null;
}

export async function getOrgOpenUrl(target: string, path?: string): Promise<string | undefined> {
  // Try modern sf first
  const attempts: Array<[string, string[]]> = [
    ["sf", ["org", "open", "--json", "--url-only", "-o", target, ...(path ? ["--path", path] : [])]],
    ["sf", ["org", "open", "--json", "--url-only", "--target-org", target, ...(path ? ["--path", path] : [])]],
    ["sfdx", ["force:org:open", "--json", "-u", target, "--urlonly", ...(path ? ["-p", path] : [])]],
  ];
  for (const [cmd, args] of attempts) {
    try {
      const { stdout } = await pexecFile(cmd, args, { shell: true });
      const data = JSON.parse(stdout);
      const url: string | undefined = data?.result?.url ?? data?.result?.orgUrl ?? data?.url;
      if (url) return url;
    } catch {
      /* try next */
    }
  }
  return undefined;
}

export async function openOrgViaCli(target: string): Promise<void> {
  // Let the CLI open the browser directly as a fallback
  const attempts: Array<[string, string[]]> = [
    ["sf", ["org", "open", "-o", target]],
    ["sf", ["org", "open", "--target-org", target]],
    ["sfdx", ["force:org:open", "-u", target]],
  ];
  for (const [cmd, args] of attempts) {
    try {
      await pexecFile(cmd, args, { shell: true });
      return;
    } catch {
      /* try next */
    }
  }
  throw new Error("Failed to open org via CLI");
}

export async function openOrgPathViaCli(target: string, path: string): Promise<void> {
  const attempts: Array<[string, string[]]> = [
    ["sf", ["org", "open", "-o", target, "--path", path]],
    ["sf", ["org", "open", "--target-org", target, "--path", path]],
    ["sfdx", ["force:org:open", "-u", target, "-p", path]],
  ];
  for (const [cmd, args] of attempts) {
    try {
      await pexecFile(cmd, args, { shell: true });
      return;
    } catch {
      /* try next */
    }
  }
  throw new Error("Failed to open org path via CLI");
}
