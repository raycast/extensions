/**
 * Manual smoke test only — hits the live Toshl API with your token. Not run by npm scripts or Raycast CI.
 * Creates disposable QTT-TEST-* resources and deletes them at the end.
 *
 * Toshl often returns `201` with an empty body; the new resource id is in the `Location` header.
 *
 * Run locally (do not echo the key). Prefer the long developer token:
 *   TOSHL_API_KEY=$(op read "op://Code/Toshl API/credential") node scripts/toshl-integration-test.cjs
 * Alternate login item (if password holds the token):
 *   TOSHL_API_KEY=$(op read "op://Code/ToshlAPI/password") node scripts/toshl-integration-test.cjs
 */
const axios = require("axios");
const { execSync } = require("child_process");

const BASE = "https://api.toshl.com";
const PREFIX = `QTT-TEST-${new Date().toISOString().slice(0, 10)}-${process.pid}-`;

function client(apiKey) {
  return axios.create({
    baseURL: BASE,
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      Accept: "application/json",
    },
    validateStatus: () => true,
  });
}

/** Toshl returns `/resource/id` or full URL in `Location`. */
function idFromLocation(loc) {
  if (!loc) return null;
  const m = String(loc).match(/\/(categories|tags|accounts|entries|budgets)\/([^/\s?]+)/);
  return m ? m[2] : null;
}

function createdId(response) {
  return idFromLocation(response.headers?.location) || (response.data && response.data.id) || null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthRange() {
  const d = new Date();
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  return { from, to };
}

async function main() {
  let apiKey = process.env.TOSHL_API_KEY?.trim();
  if (!apiKey) {
    try {
      apiKey = execSync('op read "op://Code/Toshl API/credential"', { encoding: "utf8" }).trim();
      console.log("(using 1Password: op://Code/Toshl API/credential)\n");
    } catch {
      console.error('Missing TOSHL_API_KEY. Set it or run: op read "op://Code/Toshl API/credential"');
      process.exit(1);
    }
  }

  const api = client(apiKey.trim());
  const created = {
    entryIds: [],
    budgetId: null,
    tagId: null,
    categoryId: null,
    accountIds: [],
  };

  const log = (msg, extra) => {
    if (extra !== undefined) console.log(msg, extra);
    else console.log(msg);
  };

  async function cleanup(reason) {
    log(`\n--- cleanup (${reason}) ---`);
    for (const id of created.entryIds) {
      if (!id) continue;
      const r = await api.delete(`/entries/${id}`);
      log(`DELETE /entries/${id}`, r.status);
    }
    if (created.budgetId) {
      const r = await api.delete(`/budgets/${created.budgetId}`);
      log(`DELETE /budgets/${created.budgetId}`, r.status);
    }
    if (created.tagId) {
      const r = await api.delete(`/tags/${created.tagId}`);
      log(`DELETE /tags/${created.tagId}`, r.status);
    }
    for (const id of [...created.accountIds].reverse()) {
      if (!id) continue;
      const r = await api.delete(`/accounts/${id}`);
      log(`DELETE /accounts/${id}`, r.status);
    }
    if (created.categoryId) {
      const r = await api.delete(`/categories/${created.categoryId}`);
      log(`DELETE /categories/${created.categoryId}`, r.status);
    }
  }

  try {
    log("GET /me");
    const me = await api.get("/me");
    if (me.status !== 200) {
      log("me failed", { status: me.status, data: me.data });
      process.exit(1);
    }
    const mainCurrency = me.data?.currency?.main || "USD";
    log("OK default currency:", mainCurrency);

    log("GET /rate-limit");
    const rl = await api.get("/rate-limit");
    if (rl.status === 200) log("rate-limit", rl.data);
    else log("rate-limit skipped (status " + rl.status + " — endpoint may differ for this API version)");

    log("POST category");
    const cat = await api.post("/categories", {
      name: `${PREFIX}category`,
      type: "expense",
      extra: { quick_toshl_test: true },
    });
    if (cat.status !== 200 && cat.status !== 201) {
      throw new Error(`create category ${cat.status}: ${JSON.stringify(cat.data)}`);
    }
    created.categoryId = createdId(cat);
    if (!created.categoryId) throw new Error("create category: no id in Location/body");
    log("category id", created.categoryId);

    log("POST tag");
    const tag = await api.post("/tags", {
      name: `${PREFIX}tag`,
      type: "expense",
      category: created.categoryId,
      extra: { quick_toshl_test: true },
    });
    if (tag.status !== 200 && tag.status !== 201) {
      throw new Error(`create tag ${tag.status}: ${JSON.stringify(tag.data)}`);
    }
    created.tagId = createdId(tag);
    if (!created.tagId) throw new Error("create tag: no id in Location/body");
    log("tag id", created.tagId);

    log("POST accounts (x2 for transfer)");
    for (let i = 1; i <= 2; i++) {
      const acc = await api.post("/accounts", {
        name: `${PREFIX}acct${i}`,
        currency: { code: mainCurrency },
        initial_balance: 0,
        extra: { quick_toshl_test: true },
      });
      if (acc.status !== 200 && acc.status !== 201) {
        throw new Error(`create account ${acc.status}: ${JSON.stringify(acc.data)}`);
      }
      const aid = createdId(acc);
      if (!aid) throw new Error("create account: no id in Location/body");
      created.accountIds.push(aid);
      log(`account${i} id`, aid);
    }

    const [fromAcc, toAcc] = created.accountIds;

    log("POST expense entry");
    const expense = await api.post("/entries", {
      amount: -1.23,
      currency: { code: mainCurrency },
      date: today(),
      desc: `${PREFIX}expense`,
      account: fromAcc,
      category: created.categoryId,
      tags: [created.tagId],
      extra: { quick_toshl_test: true },
    });
    if (expense.status !== 200 && expense.status !== 201) {
      throw new Error(`create expense ${expense.status}: ${JSON.stringify(expense.data)}`);
    }
    const eid = createdId(expense);
    if (!eid) throw new Error("create expense: no id in Location/body");
    created.entryIds.push(eid);
    log("expense entry id", eid);

    log("POST transfer");
    const xfer = await api.post("/entries", {
      amount: -0.5,
      currency: { code: mainCurrency },
      date: today(),
      desc: `${PREFIX}transfer`,
      account: fromAcc,
      transaction: {
        account: toAcc,
        currency: { code: mainCurrency },
      },
      extra: { quick_toshl_test: true },
    });
    if (xfer.status !== 200 && xfer.status !== 201) {
      throw new Error(`create transfer ${xfer.status}: ${JSON.stringify(xfer.data)}`);
    }
    const xferId = createdId(xfer);
    if (!xferId) throw new Error("create transfer: no id in Location/body");
    created.entryIds.push(xferId);
    log("transfer entry id", xferId);

    log("GET /entries/{id} (transfer)");
    const one = await api.get(`/entries/${xferId}`);
    if (one.status !== 200) throw new Error(`get entry ${one.status}: ${JSON.stringify(one.data)}`);
    log("get entry", one.status, one.data?.id);

    log("PUT /entries/{id} (transfer tweak)");
    if (!one.data?.modified) throw new Error("missing modified on transfer entry");
    const upd = await api.put(`/entries/${xferId}`, {
      amount: -0.51,
      currency: { code: mainCurrency },
      date: today(),
      desc: `${PREFIX}transfer-updated`,
      account: fromAcc,
      transaction: {
        id: one.data.transaction?.id,
        account: toAcc,
        currency: { code: mainCurrency },
      },
      modified: one.data.modified,
      extra: { quick_toshl_test: true },
    });
    log("update transfer", upd.status);
    if (upd.status !== 200) log("update transfer body", upd.data);

    const { from, to } = monthRange();
    log("GET /tags/sums", { from, to, currency: mainCurrency });
    const sums = await api.get("/tags/sums", { params: { from, to, currency: mainCurrency, type: "expense" } });
    log(
      "tags/sums status",
      sums.status,
      sums.status === 200
        ? typeof sums.data === "object"
          ? "object"
          : typeof sums.data
        : sums.data,
    );

    log("GET /entries/locations", { from, to });
    const locs = await api.get("/entries/locations", { params: { from, to, per_page: 20 } });
    log(
      "entries/locations status",
      locs.status,
      locs.status === 200 ? (Array.isArray(locs.data) ? `array len ${locs.data.length}` : typeof locs.data) : locs.data,
    );

    log("POST budget (optional — may 403 on free plan)");
    const bud = await api.post("/budgets", {
      name: `${PREFIX}budget`,
      limit: 10,
      type: "regular",
      currency: { code: mainCurrency },
      categories: [created.categoryId],
      from,
      to,
      recurrence: { frequency: "monthly", interval: 1, start: from },
      extra: { quick_toshl_test: true },
    });
    if (bud.status === 200 || bud.status === 201) {
      created.budgetId = createdId(bud);
      log("budget id", created.budgetId);
    } else {
      log("budget skipped", bud.status, typeof bud.data === "object" ? bud.data?.error || bud.data?.description || bud.data?.message : bud.data);
    }

    log("\n--- all primary checks passed ---");
  } catch (e) {
    console.error("FAIL:", e.message || e);
    await cleanup("after error");
    process.exit(1);
  }

  await cleanup("success");
  log("\nDone. All test resources removed.");
}

main();
