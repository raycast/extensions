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
  const {
    changeBudget,
    describeBudgets,
    getAverageMonthlySpending,
    getAverageSpendingPeriodDates,
    getBudgetProgress,
    getBudgetTotals,
    getSpendingPeriodDates,
    organizeBudgets,
    saveBudgetForTool,
  } = await import(output);
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

  test("filter and sort treat each budget as its own category, ignoring subcategory spending", () => {
    const sibling = { id: 72, name: "Train", parent_id: 69, category_type: "expense" };
    const categories = [parent, expense, sibling];
    const rows = describeBudgets(
      [
        { category_id: 71, amount: 1000 },
        { category_id: 69, amount: 4000 },
        { category_id: 72, amount: 2000 },
      ],
      categories,
    );
    const date = new Date(2026, 9, 17);
    // Transport's own spending is 100 (2.5%); Train 71 is 120% and Train 72 is 80%.
    const periods = [{ start_date: "2026-10-01", categories: { 69: -100, 71: -1200, 72: -1600 } }];
    const ids = (filter, sort, data) =>
      organizeBudgets(rows, data, date, filter, sort).map((budget) => budget.category_id);
    assert.deepEqual(ids("all", "name", periods), [71, 72, 69]);
    assert.deepEqual(ids("all", "limit", periods), [69, 72, 71]);
    assert.deepEqual(ids("all", "percent", periods), [71, 72, 69]);
    assert.deepEqual(ids("all", "spent", periods), [72, 71, 69]);
    assert.deepEqual(ids("all", "spent", undefined), [71, 72, 69]);
    assert.deepEqual(ids("over", "name", periods), [71]);
    assert.deepEqual(ids("near", "name", periods), [72]);
    assert.deepEqual(ids("over", "name", undefined), []);
    assert.deepEqual(ids("all", "percent", undefined), [71, 72, 69]);
  });

  test("calendar-month spending request spans previous and current month", () => {
    assert.deepEqual(getSpendingPeriodDates(new Date(2026, 0, 17)), { startDate: "2025-12-01", endDate: "2026-01-31" });
  });

  test("a parent budget counts only its own category, never its subcategories", () => {
    const periods = [
      { start_date: "2026-09-01", categories: { 69: -100, 71: -200, 72: -50 } },
      { start_date: "2026-10-01", categories: { 69: -200, 71: -400, 72: -50 } },
    ];
    assert.deepEqual(getBudgetProgress({ category_id: 69, amount: 1000 }, periods, new Date(2026, 9, 17)), {
      spent: 200,
      percent: 20,
    });
    assert.deepEqual(getBudgetProgress({ category_id: 71, amount: 200 }, periods, new Date(2026, 9, 17)), {
      spent: 400,
      percent: 200,
    });
    assert.deepEqual(getBudgetProgress({ category_id: 69, amount: 1000 }, periods, new Date(2026, 8, 1)), {
      spent: 100,
      percent: 10,
    });
    // No spending recorded for the category this month is genuine zero, not missing data.
    assert.deepEqual(getBudgetProgress({ category_id: 73, amount: 1000 }, periods, new Date(2026, 9, 17)), {
      spent: 0,
      percent: 0,
    });
  });

  test("missing or malformed spending never displays fabricated zero progress", () => {
    const budget = { category_id: 71, amount: 1000 };
    const date = new Date(2026, 9, 17);
    assert.equal(getBudgetProgress(budget, [], date), undefined);
    assert.equal(getBudgetProgress(budget, [{ start_date: "2026-10-01", categories: { 71: "-50" } }], date), undefined);
    assert.equal(getBudgetProgress(budget, [{ start_date: "2026-10-01", categories: { 71: 50 } }], date), undefined);
  });

  test("total budget is a plain sum of independent parent and subcategory budgets", () => {
    const date = new Date(2026, 9, 17);
    const budgets = [
      { category_id: 69, amount: 1000 },
      { category_id: 71, amount: 500 },
    ];
    const periods = [{ start_date: "2026-10-01", categories: { 69: -100, 71: -200 } }];
    assert.deepEqual(getBudgetTotals(budgets, periods, date), { limit: 1500, spent: 300 });
    assert.deepEqual(getBudgetTotals(budgets, [], date), { limit: 1500 });
    assert.deepEqual(getBudgetTotals(budgets, [{ start_date: "2026-10-01", categories: { 71: "-50" } }], date), {
      limit: 1500,
    });
  });

  test("12-month average excludes current partial month and refuses incomplete history", () => {
    const date = new Date(2026, 9, 17);
    assert.deepEqual(getAverageSpendingPeriodDates(date), { startDate: "2025-10-01", endDate: "2026-09-30" });
    const periods = Array.from({ length: 12 }, (_, index) => ({
      start_date: `${new Date(2025, 9 + index, 1).getFullYear()}-${String(new Date(2025, 9 + index, 1).getMonth() + 1).padStart(2, "0")}-01`,
      categories: { 71: -120 },
    }));
    periods.push({ start_date: "2026-10-01", categories: { 71: -1000 } });
    assert.equal(getAverageMonthlySpending({ category_id: 71, amount: 500 }, periods, date), 120);
    assert.equal(getAverageMonthlySpending({ category_id: 71, amount: 500 }, periods.slice(1), date), undefined);
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

  test("join each budget to its category without computing spending", () => {
    const state = fixture([{ category_id: 71, amount: 1000 }]);
    assert.deepEqual(describeBudgets(state.budgets, state.categories), [
      { category_id: 71, amount: 1000, category: expense },
    ]);
  });
} finally {
  after(() => rm(directory, { recursive: true, force: true }));
}
