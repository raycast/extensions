import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const directory = await mkdtemp(join(tmpdir(), "moneytree-budget-tests-"));
const output = join(directory, "budgets.mjs");
try {
  await build({
    entryPoints: [new URL("../src/lib/budgets.ts", import.meta.url).pathname],
    outfile: output,
    bundle: true,
    format: "esm",
    platform: "node",
    plugins: [
      {
        name: "mock-api",
        setup(plugin) {
          plugin.onResolve({ filter: /^\.\/api$/ }, () => ({ path: "api", namespace: "mock" }));
          plugin.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
            contents: `
            export async function getBudgets() { return [...globalThis.__budgetFixture.budgets]; }
            export async function getCategories() { return globalThis.__budgetFixture.categories; }
            export async function putBudget(id, amount) {
              globalThis.__budgetFixture.writes.push(['put', id, amount]);
              if (!globalThis.__budgetFixture.dropWrites) {
                globalThis.__budgetFixture.budgets = globalThis.__budgetFixture.budgets.filter(b => b.category_id !== id);
                globalThis.__budgetFixture.budgets.push({category_id: id, amount});
              }
            }
            export async function removeBudget(id) {
              globalThis.__budgetFixture.writes.push(['delete', id]);
              if (!globalThis.__budgetFixture.dropWrites)
                globalThis.__budgetFixture.budgets = globalThis.__budgetFixture.budgets.filter(b => b.category_id !== id);
            }
          `,
            loader: "js",
          }));
        },
      },
    ],
  });
  const { changeBudget, describeBudgets, saveBudgetForTool } = await import(output);
  const expense = { id: 71, name: "Train", parent_id: 69, category_type: "expense" };
  const parent = { id: 69, name: "Transport", parent_id: null, category_type: "expense" };
  const income = { id: 101, name: "Salary", parent_id: null, category_type: "income" };
  function fixture(budgets = []) {
    globalThis.__budgetFixture = { budgets, categories: [expense, parent, income], writes: [] };
    return globalThis.__budgetFixture;
  }

  test("create, update, and delete use the same write path with read-after-write verification", async () => {
    const state = fixture();
    assert.deepEqual(await changeBudget("create", 71, 1234), { category_id: 71, amount: 1234, categoryName: "Train" });
    assert.deepEqual(await changeBudget("update", 71, 2345), { category_id: 71, amount: 2345, categoryName: "Train" });
    assert.equal(await changeBudget("delete", 71), null);
    assert.deepEqual(state.writes, [
      ["put", 71, 1234],
      ["put", 71, 2345],
      ["delete", 71],
    ]);
  });

  test("create and update tools share the verified result without another context read", async () => {
    const state = fixture();
    assert.deepEqual(await saveBudgetForTool("create", 71, 1234), {
      categoryId: 71,
      categoryName: "Train",
      amount: 1234,
      verified: true,
    });
    assert.deepEqual(await saveBudgetForTool("update", 71, 2345), {
      categoryId: 71,
      categoryName: "Train",
      amount: 2345,
      verified: true,
    });
    assert.deepEqual(state.writes, [
      ["put", 71, 1234],
      ["put", 71, 2345],
    ]);
  });

  test("show all 50 saved budgets without client-side pagination or truncation", () => {
    const state = fixture(Array.from({ length: 50 }, (_, i) => ({ category_id: 1000 + i, amount: 1000 + i })));
    state.categories.push(
      ...Array.from({ length: 50 }, (_, i) => ({
        id: 1000 + i,
        name: `Category ${i + 1}`,
        parent_id: null,
        category_type: "expense",
      })),
    );
    assert.equal(describeBudgets(state.budgets, state.categories).length, 50);
    assert.equal(describeBudgets(state.budgets, state.categories)[49].category.name, "Category 50");
  });

  test("reject duplicate creation and missing updates/deletions without writes", async () => {
    const state = fixture([{ category_id: 71, amount: 1000 }]);
    await assert.rejects(changeBudget("create", 71, 2000), /already has a budget/);
    state.budgets = [];
    await assert.rejects(changeBudget("update", 71, 2000), /has no budget/);
    await assert.rejects(changeBudget("delete", 71), /has no budget/);
    assert.deepEqual(state.writes, []);
  });

  test("reject invalid category, income category, and invalid yen amounts", async () => {
    const state = fixture();
    await assert.rejects(changeBudget("create", 999, 1000), /not found/);
    await assert.rejects(changeBudget("create", 101, 1000), /expense categories/);
    for (const value of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(changeBudget("create", 71, value), /positive whole number/);
    }
    assert.deepEqual(state.writes, []);
  });

  test("detect server writes not reflected in a fresh read", async () => {
    const state = fixture();
    state.dropWrites = true;
    await assert.rejects(changeBudget("create", 71, 1000), /not returned/);
    state.budgets = [{ category_id: 71, amount: 1000 }];
    await assert.rejects(changeBudget("delete", 71), /still appears/);
  });

  test("join category and parent names without computing spending", () => {
    const state = fixture([{ category_id: 71, amount: 1000 }]);
    assert.deepEqual(describeBudgets(state.budgets, state.categories)[0].parentName, "Transport");
  });
} finally {
  after(() => rm(directory, { recursive: true, force: true }));
}
