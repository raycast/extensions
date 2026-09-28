import { fetchClaude } from "../providers/claude";
import { fetchCodex } from "../providers/codex";
import { fetchCustomProviders } from "../providers/custom";
import type { ProviderSnapshot, ProviderState, Settings } from "./types";
import { BridgeConflict, BridgeWaiting, ConnectionRequired } from "./errors";

export async function loadProviders(
  settings: Settings,
  previous: ProviderState[] = [],
): Promise<ProviderState[]> {
  const tasks: Promise<ProviderState[]>[] = [];
  const collect = async (
    id: string,
    name: string,
    fetcher: () => Promise<ProviderSnapshot>,
  ): Promise<ProviderState[]> => {
    try {
      return [{ id, name, status: "ready", snapshot: await fetcher(), bridgeConnected: id === "claude" }];
    } catch (error) {
      return [
        {
          id,
          name,
          status:
            error instanceof ConnectionRequired
              ? "setup"
              : error instanceof BridgeWaiting
                ? "waiting"
                : "error",
          needsConnection: error instanceof ConnectionRequired,
          bridgeConnected:
            id === "claude" &&
            (error instanceof BridgeWaiting ||
              error instanceof BridgeConflict ||
              (!(error instanceof ConnectionRequired) &&
                previous.some((item) => item.id === id && item.bridgeConnected))),
          error: error instanceof Error ? error.message : "Unable to load limits. Try refreshing.",
          snapshot:
            error instanceof ConnectionRequired || error instanceof BridgeConflict
              ? undefined
              : previous.find((item) => item.id === id)?.snapshot,
        },
      ];
    }
  };
  if (settings.enableCodex) tasks.push(collect("codex", "Codex", () => fetchCodex(settings)));
  if (settings.enableClaude) tasks.push(collect("claude", "Claude Code", () => fetchClaude(settings)));
  if (settings.customProviderFile?.trim()) {
    tasks.push(
      fetchCustomProviders(settings.customProviderFile).catch((error: unknown) => [
        {
          id: "custom",
          name: "Custom Providers",
          status: "error",
          error: error instanceof Error ? error.message : "Unable to read custom providers.",
        },
      ]),
    );
  }
  return (await Promise.all(tasks)).flat();
}
