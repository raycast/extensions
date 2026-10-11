import assert from "node:assert/strict";
import test from "node:test";
import { commandHarness } from "./helpers/command-harness.ts";

test("failed rewrite preserves the list and allows a successful retry with another mode", async () => {
  const ui = commandHarness("index");
  await ui.settle();
  const titles = ui.elements("Item").map((item) => item.props.title);
  ui.setRequest(async () => {
    throw new Error("Provider unavailable");
  });
  await ui.action("Rewrite");
  await ui.settle();
  assert.deepEqual(
    ui.elements("Item").map((item) => item.props.title),
    titles,
  );
  assert.match(ui.toasts[0]?.message, /Provider unavailable/);
  assert.equal(ui.toasts[0]?.style, "failure");
  assert.equal(ui.pasted.length, 0);
  assert.equal(ui.copied.length, 0);
  assert.equal(ui.tree.props.isLoading, false);
  ui.setRequest(async () =>
    Response.json({ message: { content: "Retry succeeded." } }),
  );
  await ui.action("Rewrite", 1);
  assert.deepEqual(ui.pasted, ["Retry succeeded."]);
});

for (const cancellation of ["user", "timeout"]) {
  test(`${cancellation} cancellation keeps modes available without pasting`, async () => {
    const ui = commandHarness("index");
    await ui.settle();
    ui.setRequest(
      (_, { signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("Aborted")), {
            once: true,
          });
        }),
    );
    const running = ui.action("Rewrite");
    await ui.settle();
    if (cancellation === "user") await ui.action("Cancel");
    else {
      assert.deepEqual([...ui.timers.values()], [60000]);
      [...ui.timers.keys()][0]();
    }
    await running;
    await ui.settle();
    assert.equal(ui.elements("Item").length, 12);
    assert.match(ui.toasts[0]?.message, /cancelled|60 seconds/);
    assert.equal(ui.pasted.length, 0);
    assert.equal(ui.copied.length, 0);
    assert.equal(ui.tree.props.isLoading, false);
    assert.equal(ui.timers.size, 0);
  });
}

test("oversized selection shows a toast without losing the mode list or calling HTTP", async () => {
  const ui = commandHarness("index", { text: "a".repeat(20001) });
  ui.setRequest(async () => {
    assert.fail("Oversized input reached provider");
  });
  await ui.settle();
  await ui.action("Rewrite");
  await ui.settle();
  assert.equal(ui.elements("Item").length, 12);
  assert.match(ui.toasts[0]?.message, /20000/);
  assert.equal(ui.pasted.length, 0);
});

test("initial load failure retains an error screen whose Settings action opens mode management", async () => {
  const ui = commandHarness("index", { selectionError: "No selection" });
  await ui.settle();
  assert.equal(ui.elements("Item").length, 0);
  assert.equal(ui.elements("EmptyView").length, 1);
  await ui.action("Open Settings");
  assert.equal(ui.launched[0]?.name, "settings");
  assert.equal(ui.launched[0]?.type, "user");
});

for (const language of ["en", "ru"]) {
  for (const empty of [false, true]) {
    test(`normal ${empty ? "empty" : "populated"} Settings can reset to ${language} only after confirmation`, async () => {
      const ui = commandHarness("settings", {
        preferences: { presetLanguage: language },
      });
      await ui.settle();
      if (empty) {
        const document = JSON.parse(ui.storage.get("editing-modes"));
        ui.storage.set(
          "editing-modes",
          JSON.stringify({ ...document, modes: [] }),
        );
        // Remount to reproduce an already-empty saved mode list.
      }
      const mounted = empty
        ? commandHarness("settings", {
            preferences: { presetLanguage: language },
          })
        : ui;
      if (empty)
        mounted.storage.set("editing-modes", ui.storage.get("editing-modes"));
      await mounted.settle();
      const before = mounted.storage.get("editing-modes");
      await mounted.action("Reset Modes");
      assert.equal(mounted.storage.get("editing-modes"), before);
      assert.match(
        mounted.alerts[0]?.message,
        language === "ru" ? /Russian/ : /English/,
      );
      mounted.confirm(true);
      await mounted.action("Reset Modes");
      await mounted.settle();
      assert.equal(mounted.elements("Item").length, 12);
      assert.equal(
        mounted.elements("Item")[0].props.title,
        language === "ru" ? "Исправить ошибки" : "Fix Errors",
      );
      const saved = JSON.parse(mounted.storage.get("editing-modes"));
      assert.equal(saved.language, language);
      assert.equal(
        saved.usageGeneration,
        JSON.parse(before).usageGeneration + 1,
      );
    });
  }
}
