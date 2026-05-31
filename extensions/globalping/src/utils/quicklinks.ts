import { environment } from "@raycast/api";

type QuicklinkArguments = Record<string, string | undefined>;

/**
 * Builds a Raycast deeplink for one of this extension's commands.
 */
function createExtensionDeeplink(command: string, args: QuicklinkArguments) {
  const filteredArguments = Object.fromEntries(
    Object.entries(args).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
  );

  const searchParams = new URLSearchParams();
  if (Object.keys(filteredArguments).length > 0) {
    searchParams.set("arguments", JSON.stringify(filteredArguments));
  }

  const query = searchParams.toString();
  const base = `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/${command}`;

  return query ? `${base}?${query}` : base;
}

/**
 * Omits the default world location from generated quicklink names.
 */
function formatLocationSuffix(from: string) {
  return from && from !== "world" ? ` from ${from}` : "";
}

/**
 * Creates a Raycast quicklink descriptor for the ping command.
 */
export function createPingQuicklink(target: string, from: string) {
  return {
    name: `Ping ${target}${formatLocationSuffix(from)}`,
    link: createExtensionDeeplink("ping", { target, from }),
  };
}

/**
 * Creates a Raycast quicklink descriptor for the DNS command.
 */
export function createDnsQuicklink(target: string, from: string, type: string) {
  const normalizedType = type.toUpperCase();

  return {
    name: `DNS ${normalizedType} ${target}${formatLocationSuffix(from)}`,
    link: createExtensionDeeplink("dns", { target, from, type: normalizedType }),
  };
}

/**
 * Creates a Raycast quicklink descriptor for the HTTP command.
 */
export function createHttpQuicklink(target: string, from: string, method: string) {
  const normalizedMethod = method.toUpperCase();

  return {
    name: `HTTP ${normalizedMethod} ${target}${formatLocationSuffix(from)}`,
    link: createExtensionDeeplink("http", { target, from, method: normalizedMethod }),
  };
}

/**
 * Creates a Raycast quicklink descriptor for the MTR command.
 */
export function createMtrQuicklink(target: string, from: string) {
  return {
    name: `MTR ${target}${formatLocationSuffix(from)}`,
    link: createExtensionDeeplink("mtr", { target, from }),
  };
}

/**
 * Creates a Raycast quicklink descriptor for the traceroute command.
 */
export function createTracerouteQuicklink(target: string, from: string) {
  return {
    name: `Traceroute ${target}${formatLocationSuffix(from)}`,
    link: createExtensionDeeplink("traceroute", { target, from }),
  };
}
