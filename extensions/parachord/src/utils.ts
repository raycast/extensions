import { showHUD, showToast, Toast } from "@raycast/api";

const PARACHORD_HTTP_PORT = 8888;

/**
 * Build a parachord:// protocol URL
 */
export function buildProtocolUrl(
  command: string,
  segments: string[] = [],
  params: Record<string, string> = {},
): string {
  const path = [command, ...segments.map(encodeURIComponent)].join("/");
  const searchParams = new URLSearchParams(params).toString();
  return `parachord://${path}${searchParams ? `?${searchParams}` : ""}`;
}

/**
 * Send a command to Parachord via HTTP and show feedback
 */
export async function openParachord(
  command: string,
  segments: string[] = [],
  params: Record<string, string> = {},
  hudMessage?: string,
): Promise<void> {
  const protocolUrl = buildProtocolUrl(command, segments, params);
  const httpUrl = `http://127.0.0.1:${PARACHORD_HTTP_PORT}/protocol?url=${encodeURIComponent(protocolUrl)}`;

  try {
    const response = await fetch(httpUrl);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}) as { error?: string });
      throw new Error((data as { error?: string }).error || `HTTP ${response.status}`);
    }

    if (hudMessage) {
      await showHUD(hudMessage);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Check if it's a connection error (Parachord not running)
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Parachord not running",
        message: "Start Parachord and try again",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to send command",
        message: message,
      });
    }
  }
}

/**
 * Parse "Artist - Track" format into separate parts
 */
export function parseArtistTrack(input: string): { artist: string; title: string } | null {
  // Try "Artist - Track" format first
  const dashMatch = input.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return {
      artist: dashMatch[1].trim(),
      title: dashMatch[2].trim(),
    };
  }

  // Try "Track by Artist" format
  const byMatch = input.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return {
      artist: byMatch[2].trim(),
      title: byMatch[1].trim(),
    };
  }

  return null;
}
