// Checks that the extension can talk to the DigUp on this Mac: npm run smoke [words to search for]
// It searches DigUp's own index (or the one named in ~/.config/digup-raycast/dev-settings.json) and prints counts
// only, never the names of files.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { checkReadiness, parseOverride, realSystem } from "../src/digup/installation";
import { DigUpService } from "../src/digup/service";
import { hasPassage } from "../src/search/presentation";
import { previewPlan } from "../src/search/previews";

async function main() {
  const home = homedir();
  const query = process.argv.slice(2).join(" ") || "the";
  const override = await readFile(join(home, ".config", "digup-raycast", "dev-settings.json"), "utf8").then(
    (json) => parseOverride(json, home),
    () => ({}),
  );
  const readiness = await checkReadiness([], realSystem(), override);
  if (readiness.state !== "ready") {
    throw new Error(
      `DigUp is not ready to search (${readiness.state}): install DigUp 0.6.1 or newer, open it and let it index a folder.`,
    );
  }

  const events: string[] = [];
  const service = new DigUpService(readiness.launch, {
    onEvent: (event) => events.push(event.event === "encoder" ? `encoder ${event.state}` : event.event),
    onFailed: (log) => console.error("helper failed:\n" + log),
  });
  service.start();
  try {
    const notes: string[] = [];
    const words = await service.search({ q: query, code: false, meaning: false });
    assert.equal(words.meaning, false, "a search for words only says so");
    assert.ok(words.strong <= words.hits.length, "no more strong hits than hits");
    notes.push(`${words.hits.length} by words`);

    const found = await service.search({ q: query, code: false, meaning: true });
    notes.push(found.meaning ? `${found.hits.length} by meaning` : `${found.hits.length} by words only (no model)`);

    const withText = found.hits.find(hasPassage);
    if (withText) {
      const text = await service.text(withText.segmentId, false);
      assert.ok(text === null || typeof text === "string", "a passage is text, or nothing");
      notes.push("a passage read");
    }

    const pictured = found.hits.find((hit) => previewPlan(hit).type === "render");
    const plan = pictured ? previewPlan(pictured) : undefined;
    if (pictured && plan?.type === "render") {
      const image = await service.render(pictured.path, plan.kind, plan.loc, 800);
      assert.ok(existsSync(image), "a rendered preview is a file that exists");
      notes.push(`a ${plan.kind} preview rendered`);
    }

    if (readiness.hasCode) {
      const code = await service.search({ q: query, code: true, meaning: true });
      assert.ok(code.strong <= code.hits.length, "no more strong code hits than hits");
      notes.push(`${code.hits.length} in code`);
    }
    console.log(`smoke: ok for "${query}": ${notes.join(", ")} (${events.join(", ")})`);
  } finally {
    service.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
