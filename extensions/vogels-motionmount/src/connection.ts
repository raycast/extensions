export type Connection =
  { state: "connecting" | "connected"; title: string } | { state: "failed"; title: string; message: string };

export function connection({ isLoading, error }: { isLoading: boolean; error?: Error }): Connection {
  if (isLoading) return { state: "connecting", title: "Connecting…" };
  if (error) return { state: "failed", title: "Not Connected", message: error.message };
  return { state: "connected", title: "Connected" };
}
