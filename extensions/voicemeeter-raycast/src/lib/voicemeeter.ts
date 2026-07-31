import { spawn } from "node:child_process";
import path from "node:path";
import { environment } from "@raycast/api";
import { getEffectiveSettings } from "./settings";
import {
  createTargetIdentityKeys,
  buildTargetId,
  mergeTargetName,
} from "./target";
import {
  TargetKind,
  VoicemeeterCapabilities,
  VoicemeeterState,
  VoicemeeterTarget,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let koffi: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const savedResourcesPath = (process as any).resourcesPath;
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process as any).resourcesPath = path.join(environment.assetsPath, "native");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  koffi = require("koffi/indirect");
} finally {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process as any).resourcesPath = savedResourcesPath;
}

type NativeApi = {
  VBVMR_Login: () => number;
  VBVMR_Logout: () => number;
  VBVMR_GetVoicemeeterType: (out: number[]) => number;
  VBVMR_GetVoicemeeterVersion: (out: number[]) => number;
  VBVMR_GetParameterFloat: (name: string, out: number[]) => number;
  VBVMR_SetParameterFloat: (name: string, value: number) => number;
  VBVMR_SetParameters?: (params: string) => number;
  VBVMR_GetParameterStringA: (name: string, buf: Buffer) => number;
};

let cachedApi: NativeApi | undefined;

const DLL_PATHS = [
  "VoicemeeterRemote64",
  path.join(
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    "VB",
    "Voicemeeter",
    "VoicemeeterRemote64.dll",
  ),
  path.join(
    process.env.ProgramFiles || "C:\\Program Files",
    "VB",
    "Voicemeeter",
    "VoicemeeterRemote64.dll",
  ),
];

function loadApiFromLib(lib: ReturnType<typeof koffi.load>): NativeApi {
  const api: NativeApi = {
    VBVMR_Login: lib.func("long VBVMR_Login()"),
    VBVMR_Logout: lib.func("long VBVMR_Logout()"),
    VBVMR_GetVoicemeeterType: lib.func(
      "long VBVMR_GetVoicemeeterType(_Out_ long *ptr)",
    ),
    VBVMR_GetVoicemeeterVersion: lib.func(
      "long VBVMR_GetVoicemeeterVersion(_Out_ long *ptr)",
    ),
    VBVMR_GetParameterFloat: lib.func(
      "long VBVMR_GetParameterFloat(const char *name, _Out_ float *ptr)",
    ),
    VBVMR_SetParameterFloat: lib.func(
      "long VBVMR_SetParameterFloat(const char *name, float value)",
    ),
    VBVMR_GetParameterStringA: lib.func(
      "long VBVMR_GetParameterStringA(const char *name, _Out_ char *buf)",
    ),
  };
  try {
    api.VBVMR_SetParameters = lib.func(
      "long VBVMR_SetParameters(const char *params)",
    );
  } catch {
    void 0;
  }
  return api;
}

function getNativeApi(executablePath?: string): NativeApi | undefined {
  if (cachedApi) {
    return cachedApi;
  }

  const pathsToTry = executablePath
    ? [
        path.join(path.dirname(executablePath), "VoicemeeterRemote64.dll"),
        ...DLL_PATHS,
      ]
    : DLL_PATHS;

  for (const dllPath of pathsToTry) {
    try {
      const lib = koffi.load(dllPath);
      cachedApi = loadApiFromLib(lib);
      return cachedApi;
    } catch {
      void 0;
    }
  }

  try {
    const lib = koffi.load("VoicemeeterRemote");
    cachedApi = loadApiFromLib(lib);
    return cachedApi;
  } catch {
    void 0;
  }

  return undefined;
}

function mapEdition(
  typeCode: number,
): Pick<VoicemeeterCapabilities, "edition" | "stripCount" | "busCount"> {
  if (typeCode === 1) {
    return { edition: "standard", stripCount: 3, busCount: 2 };
  }
  if (typeCode === 2) {
    return { edition: "banana", stripCount: 5, busCount: 5 };
  }
  if (typeCode === 3) {
    return { edition: "potato", stripCount: 8, busCount: 8 };
  }
  return { edition: "unknown", stripCount: 0, busCount: 0 };
}

const ROUTE_TOKENS_BY_EDITION: Record<
  VoicemeeterCapabilities["edition"],
  string[]
> = {
  standard: ["A1", "B1"],
  banana: ["A1", "A2", "A3", "B1", "B2"],
  potato: ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3"],
  unknown: ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3"],
};

function getRouteTokens(
  edition: VoicemeeterCapabilities["edition"],
  busCount: number,
): string[] {
  return ROUTE_TOKENS_BY_EDITION[edition].slice(0, busCount);
}

export function getRouteTokenForBusIndex(
  edition: VoicemeeterCapabilities["edition"],
  busCount: number,
  busIndex: number,
): string | undefined {
  if (busIndex < 0 || busIndex >= busCount) {
    return undefined;
  }
  return getRouteTokens(edition, busCount)[busIndex];
}

class VoicemeeterClient {
  private api: NativeApi | undefined;
  private connected = false;

  constructor(executablePath?: string) {
    this.api = getNativeApi(executablePath);
  }

  public isSupportedEnvironment(): boolean {
    return process.platform === "win32";
  }

  public async connect(): Promise<boolean> {
    if (!this.api || !this.isSupportedEnvironment()) {
      return false;
    }

    const rc = this.api.VBVMR_Login();
    this.connected = rc >= 0;
    return this.connected;
  }

  public disconnect(): void {
    if (!this.api || !this.connected) {
      return;
    }
    this.api.VBVMR_Logout();
    this.connected = false;
  }

  private requireConnected(): NativeApi | undefined {
    if (!this.api || !this.connected) {
      return undefined;
    }
    return this.api;
  }

  public getFloat(parameterName: string): number | undefined {
    const api = this.requireConnected();
    if (!api) {
      return undefined;
    }
    const out = [0];
    const rc = api.VBVMR_GetParameterFloat(parameterName, out);
    if (rc < 0) {
      return undefined;
    }
    return out[0];
  }

  public getString(parameterName: string): string | undefined {
    const api = this.requireConnected();
    if (!api) {
      return undefined;
    }
    const buffer = Buffer.alloc(512);
    const rc = api.VBVMR_GetParameterStringA(parameterName, buffer);
    if (rc < 0) {
      return undefined;
    }
    return buffer.toString("utf8").split("\0")[0]?.trim();
  }

  public setFloat(parameterName: string, value: number): boolean {
    const api = this.requireConnected();
    if (!api) {
      return false;
    }
    const paramLower = parameterName.replace(
      /\.(Gain|Mute)$/,
      (_, m) => `.${m.toLowerCase()}`,
    );
    let rc = api.VBVMR_SetParameterFloat(paramLower, value);
    if (rc < 0) {
      rc = api.VBVMR_SetParameterFloat(parameterName, value);
    }
    if (rc < 0 && api.VBVMR_SetParameters) {
      rc = api.VBVMR_SetParameters(`${paramLower}=${value}`);
    }
    return rc >= 0;
  }

  public getTypeCode(): number | undefined {
    const api = this.requireConnected();
    if (!api) {
      return undefined;
    }
    const out = [0];
    const rc = api.VBVMR_GetVoicemeeterType(out);
    if (rc < 0) {
      return undefined;
    }
    return out[0];
  }

  public getVersionCode(): number | undefined {
    const api = this.requireConnected();
    if (!api) {
      return undefined;
    }
    const out = [0];
    const rc = api.VBVMR_GetVoicemeeterVersion(out);
    if (rc < 0) {
      return undefined;
    }
    return out[0];
  }
}

let sharedClient: VoicemeeterClient | null = null;
let sharedClientPromise: Promise<VoicemeeterClient | null> | null = null;

async function getSharedClient(): Promise<VoicemeeterClient | null> {
  if (sharedClient) {
    return sharedClient;
  }
  if (sharedClientPromise) {
    return sharedClientPromise;
  }
  sharedClientPromise = (async () => {
    const settings = await getEffectiveSettings();
    const client = new VoicemeeterClient(settings.voicemeeterExecutablePath);
    if (!client.isSupportedEnvironment()) {
      return null;
    }
    const connected = await client.connect();
    if (!connected) {
      return null;
    }
    sharedClient = client;
    return client;
  })();
  try {
    const client = await sharedClientPromise;
    if (!client) {
      sharedClientPromise = null;
    }
    return client;
  } catch (error) {
    sharedClientPromise = null;
    throw error;
  }
}

export function disconnectVoicemeeter(): void {
  if (sharedClient) {
    sharedClient.disconnect();
    sharedClient = null;
    sharedClientPromise = null;
  }
}

export const logout = disconnectVoicemeeter;

if (typeof process !== "undefined") {
  process.on("exit", disconnectVoicemeeter);
  process.on("beforeExit", disconnectVoicemeeter);
  process.on("SIGINT", disconnectVoicemeeter);
  process.on("SIGTERM", disconnectVoicemeeter);
}

function makeParameter(
  target: VoicemeeterTarget,
  field: "Mute" | "Gain" | "Label",
): string {
  const head = target.kind === "strip" ? "Strip" : "Bus";
  return `${head}[${target.index}].${field}`;
}

function detectCount(
  client: VoicemeeterClient,
  kind: TargetKind,
  max: number,
): number {
  const head = kind === "strip" ? "Strip" : "Bus";
  let count = 0;

  for (let i = 0; i < max; i += 1) {
    const probe = client.getFloat(`${head}[${i}].Gain`);
    if (probe === undefined) {
      break;
    }
    count += 1;
  }

  return count;
}

function buildTargets(
  client: VoicemeeterClient,
  kind: TargetKind,
  count: number,
  routeTokens: string[],
): VoicemeeterTarget[] {
  const targets: VoicemeeterTarget[] = [];

  for (let index = 0; index < count; index += 1) {
    const head = kind === "strip" ? "Strip" : "Bus";
    const gain = client.getFloat(`${head}[${index}].Gain`);
    const mute = client.getFloat(`${head}[${index}].Mute`);
    if (gain === undefined || mute === undefined) {
      continue;
    }
    const label = client.getString(`${head}[${index}].Label`);
    const name = mergeTargetName(kind, index, label);
    let deviceIn: string | undefined;
    let routes: boolean[] | undefined;
    if (kind === "strip") {
      deviceIn = client.getString(`Strip[${index}].device.in`) ?? undefined;
      routes = routeTokens.map((token) => {
        const value = client.getFloat(`Strip[${index}].${token}`);
        return value !== undefined && value >= 0.5;
      });
    }
    targets.push({
      id: buildTargetId(kind, index, name),
      kind,
      index,
      name,
      gain,
      mute: mute >= 0.5,
      identityKeys: createTargetIdentityKeys(kind, index, name),
      ...(routes && { routes }),
      ...(deviceIn && { deviceIn }),
    });
  }

  return targets;
}

export async function readVoicemeeterState(): Promise<VoicemeeterState> {
  const client = await getSharedClient();
  if (!client) {
    const settings = await getEffectiveSettings();
    const probe = new VoicemeeterClient(settings.voicemeeterExecutablePath);
    if (!probe.isSupportedEnvironment()) {
      return {
        connected: false,
        capabilities: {
          connected: false,
          edition: "unknown",
          stripCount: 0,
          busCount: 0,
        },
        targets: [],
        error: "This extension only supports Windows.",
      };
    }
    return {
      connected: false,
      capabilities: {
        connected: false,
        edition: "unknown",
        stripCount: 0,
        busCount: 0,
      },
      targets: [],
      error: "Voicemeeter API unavailable.",
    };
  }

  const typeCode = client.getTypeCode() ?? 0;
  const mapped = mapEdition(typeCode);

  let stripCount = mapped.stripCount;
  let busCount = mapped.busCount;
  if (stripCount === 0 && busCount === 0) {
    stripCount = detectCount(client, "strip", 16);
    busCount = detectCount(client, "bus", 16);
  }

  const routeTokens = getRouteTokens(mapped.edition, busCount);
  const strips = buildTargets(client, "strip", stripCount, routeTokens);
  const buses = buildTargets(client, "bus", busCount, routeTokens);

  return {
    connected: true,
    capabilities: {
      connected: true,
      edition: mapped.edition,
      stripCount: strips.length,
      busCount: buses.length,
    },
    targets: [...strips, ...buses],
  };
}

export async function readTargetCurrentMute(
  target: VoicemeeterTarget,
): Promise<boolean | undefined> {
  const client = await getSharedClient();
  if (!client) {
    return undefined;
  }

  const raw = client.getFloat(makeParameter(target, "Mute"));
  if (raw === undefined) {
    return undefined;
  }
  return raw >= 0.5;
}

export async function writeTargetMute(
  target: VoicemeeterTarget,
  mute: boolean,
): Promise<boolean> {
  const client = await getSharedClient();
  if (!client) {
    return false;
  }

  const ok = client.setFloat(makeParameter(target, "Mute"), mute ? 1 : 0);
  if (ok) {
    await new Promise((r) => setTimeout(r, 50));
  }
  return ok;
}

export async function writeTargetGain(
  target: VoicemeeterTarget,
  gain: number,
): Promise<boolean> {
  const client = await getSharedClient();
  if (!client) {
    return false;
  }

  const ok = client.setFloat(makeParameter(target, "Gain"), gain);
  if (ok) {
    await new Promise((r) => setTimeout(r, 50));
  }
  return ok;
}

export async function writeStripRoute(
  stripIndex: number,
  routeToken: string,
  enabled: boolean,
): Promise<boolean> {
  const client = await getSharedClient();
  if (!client) {
    return false;
  }
  const ok = client.setFloat(
    `Strip[${stripIndex}].${routeToken}`,
    enabled ? 1 : 0,
  );
  if (ok) {
    await new Promise((r) => setTimeout(r, 50));
  }
  return ok;
}

export async function launchVoicemeeter(
  executablePath: string,
): Promise<boolean> {
  if (process.platform !== "win32") {
    return false;
  }

  try {
    const child = spawn(executablePath, [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
