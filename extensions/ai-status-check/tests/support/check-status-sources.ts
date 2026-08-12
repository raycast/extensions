import { providerStatusPresentation } from "../../src/domain/status-presentation";
import { PROVIDERS } from "../../src/providers/registry";

async function main() {
  const results = await Promise.allSettled(
    PROVIDERS.map(async (provider) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error("Timed out")), 8_000);

      try {
        const snapshot = await provider.adapter.fetch(controller.signal);
        return {
          provider: provider.name,
          health:
            snapshot.health === "unknown" && !snapshot.statusText
              ? "No Overall Status"
              : providerStatusPresentation(snapshot).label,
          components: snapshot.components.length,
          incidents: snapshot.incidents.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown source error";
        throw new Error(`${provider.name}: ${message}`, { cause: error });
      } finally {
        clearTimeout(timeout);
      }
    }),
  );

  let failures = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      const { provider, health, components, incidents } = result.value;
      console.log(`${provider}: ${health}; ${components} components; ${incidents} incidents`);
    } else {
      failures += 1;
      console.error(result.reason instanceof Error ? result.reason.message : "Unknown source error");
    }
  }

  if (failures > 0) process.exitCode = 1;
}

void main();
