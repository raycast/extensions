import { providerStatusPresentation } from "../../src/domain/status-presentation";
import type { ComponentHistory } from "../../src/domain/types";
import { assertProviderSnapshot, assertComponentHistory } from "../../src/domain/snapshot-validation";
import { PROVIDERS } from "../../src/providers/registry";

async function main() {
  const results = await Promise.allSettled(
    PROVIDERS.map(async (provider) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error("Timed out")), 8_000);

      try {
        const snapshot = await provider.adapter.fetch(controller.signal);
        assertProviderSnapshot(snapshot, provider.id);
        const histories = await Promise.all(
          snapshot.components.map(async (component) => {
            if (component.history) return component.history;
            if (!provider.adapter.fetchComponentHistory) return undefined;
            const history = await provider.adapter.fetchComponentHistory(component.id, controller.signal);
            if (!history) throw new Error(`${component.name} did not publish component history`);
            return history;
          }),
        );
        const publishedHistories = histories.filter((history): history is ComponentHistory => Boolean(history));
        if (snapshot.components.length > 0 && publishedHistories.length === 0) {
          throw new Error("no component history could be read from the official source");
        }
        for (const history of publishedHistories) assertComponentHistory(history);
        return {
          provider: provider.name,
          health:
            snapshot.health === "unknown" && !snapshot.statusText
              ? "No Overall Status"
              : providerStatusPresentation(snapshot).label,
          components: snapshot.components.length,
          incidents: snapshot.incidents.length,
          histories: publishedHistories.length,
          exactUptimes: publishedHistories.filter((history) => history.uptimeText !== undefined).length,
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
      const { provider, health, components, incidents, histories, exactUptimes } = result.value;
      console.log(
        `${provider}: ${health}; ${components} components; ${incidents} incidents; ${histories} histories; ${exactUptimes} exact uptimes`,
      );
    } else {
      failures += 1;
      console.error(result.reason instanceof Error ? result.reason.message : "Unknown source error");
    }
  }

  const passed = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  console.log(
    `Verified ${passed.length}/${PROVIDERS.length} providers; ${passed.reduce((sum, result) => sum + result.histories, 0)} component histories; ${passed.reduce((sum, result) => sum + result.exactUptimes, 0)} exact uptimes`,
  );

  if (failures > 0) process.exitCode = 1;
}

void main();
