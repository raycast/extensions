function isDebugEnabled(): boolean {
  const explicit = process.env.NIBIT_RAYCAST_DEBUG?.trim().toLowerCase();
  return explicit === "1" || explicit === "true" || explicit === "yes";
}

export function debugLog(message: string, ...args: unknown[]): void {
  if (isDebugEnabled()) console.log(message, ...args);
}
