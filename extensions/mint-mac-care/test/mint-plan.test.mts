import assert from "node:assert/strict";
import test from "node:test";
import { formatBytes } from "../src/mint-cli.ts";
import {
  BUNDLED_PRICES,
  WORDS,
  isDrawableChart,
  money,
  planTiles,
  pricesFromFeed,
  readyNow,
  readyParts,
  statusLine,
  usableValue,
  valueFooter,
  heldForWeek,
  keptSizes,
  refusedForPlan,
  type PlanValue,
} from "../src/mint-plan.ts";
import { gapLabelBox, planWallSVG, wrapTerms } from "../src/mint-visuals.ts";
import {
  BUNDLED_MODEL,
  dollars,
  gapLabel,
  gbLabel,
  roomChart,
  stepFor,
  storageGBFor,
  usableModel,
  worth,
} from "../src/space-value-model.ts";
import { ORDER_LABELS, PRICING_PAGE_URL, feedModel, modelValue, purchaseURL, unlockRows } from "../src/mint-plan.ts";

/** What a picture says, its text in order, tags dropped. */
const words = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1].replace(/&amp;/g, "&")).join(" ");

/** A chart in the page's own frame (PlanPageRoomChart: 320 × 124, axis at 108). */
function chart(fall = 60) {
  const mint = [[0, 16]];
  for (let i = 1; i <= 60; i += 1)
    mint.push([(320 * (i - 0.18)) / 60, 18 + (10 * i) / 60], [(320 * i) / 60, 16 + (10 * i) / 60]);
  const never = Array.from({ length: 65 }, (_, i) => [
    (320 * i) / 64,
    16 + (10 * i) / 64 + fall * Math.pow(i / 64, 1.8),
  ]);
  return { width: 320, height: 124, top: 16, axis: 108, mint, never };
}

const value: PlanValue = {
  state: "starting",
  soFarBytes: 3_530_000_000,
  heldBytes: 6_000_000_000,
  held: "waiting",
  monthGB: 5,
  months: 36,
  keptGB: 189.53,
  worth: 116.52,
  worthText: "$117",
  gapLabel: "190 GB back",
  counts: [
    { figure: "3.53 GB", label: "so far", accent: false },
    { figure: "6 GB", label: "ready now", accent: true },
  ],
  chart: chart(),
};

test("the line under the title is the page's: spent, or what is left; none on a plan", () => {
  assert.equal(statusLine({ plan: false, remainingCleanupBytes: 0 }), "Weekly limit reached · Resets next Monday");
  assert.equal(
    statusLine({ plan: false, remainingCleanupBytes: 445_100_000 }),
    "445.1 MB of free care left · Resets next Monday",
  );
  assert.equal(statusLine({ plan: true, remainingCleanupBytes: null }), undefined);
  assert.equal(statusLine({ plan: false, remainingCleanupBytes: null }), undefined);
  assert.equal(statusLine(undefined), undefined);
});

test("the wall replaces an error only when it was Mint's plan refusal, read without words", () => {
  // The week's gate: exactly access.check's `allowed`; banked GB can keep a Mac allowed at 0 left.
  assert.equal(refusedForPlan({ plan: false, allowed: false, remainingCleanupBytes: 0 }), true);
  assert.equal(refusedForPlan({ plan: false, allowed: true, remainingCleanupBytes: 0 }), false);
  assert.equal(refusedForPlan({ plan: false, allowed: true, remainingCleanupBytes: 400_000_000 }), false);
  assert.equal(refusedForPlan({ plan: true, allowed: true, remainingCleanupBytes: null }), false);
  assert.equal(refusedForPlan(undefined), false);
  // Custom rules and Auto Care: their own flags, whatever the week says.
  assert.equal(refusedForPlan({ plan: false, allowed: true, customRulesAllowed: false }, "rules"), true);
  assert.equal(refusedForPlan({ plan: false, allowed: false, customRulesAllowed: true }, "rules"), false);
  assert.equal(refusedForPlan({ plan: false, automationAllowed: true }, "autocare"), false);
  assert.equal(refusedForPlan({ plan: false, automationAllowed: false }, "autocare"), true);
  assert.equal(refusedForPlan({ plan: true, customRulesAllowed: false }, "rules"), false);
});

test("a file left as it was opens the wall only when the week could not cover it", () => {
  const MB = 1_000_000;
  // The guest's spent week (2026-11-10): Mint kept its gate open with 64,780 bytes left and refused each file.
  assert.equal(heldForWeek({ plan: false, allowed: true, remainingCleanupBytes: 64_780 }, [5 * MB, 2 * MB]), true);
  // Greptile's case: 800 MB asked with 1 GB free, 600 MB done, a 200 MB file left because it was in use. The 400 MB
  // still free covers it, so the week did not refuse it: no wall, the file keeps its own message.
  assert.equal(heldForWeek({ plan: false, allowed: true, remainingCleanupBytes: 400 * MB }, [200 * MB]), false);
  // One file of several larger than what is left is enough.
  assert.equal(heldForWeek({ plan: false, allowed: true, remainingCleanupBytes: 50 * MB }, [10 * MB, 80 * MB]), true);
  // Mint's own gate closed.
  assert.equal(heldForWeek({ plan: false, allowed: false, remainingCleanupBytes: 0 }, [1]), true);
  // Nothing left as it was, a plan, or a week Mint did not state.
  assert.equal(heldForWeek({ plan: false, allowed: true, remainingCleanupBytes: 64_780 }, []), false);
  assert.equal(heldForWeek({ plan: true, allowed: true, remainingCleanupBytes: null }, [92 * MB]), false);
  assert.equal(heldForWeek({ plan: false, allowed: true }, [92 * MB]), false);
  assert.equal(heldForWeek(undefined, [92 * MB]), false);
});

test("each failure counts what its own item asked; an item Mint does not name counts them all", () => {
  type Item = { path: string; bytes: number };
  const items: Item[] = [
    { path: "/Users/a/Downloads/big.mov", bytes: 300 },
    { path: "/Users/a/Downloads/small.png", bytes: 20 },
  ];
  const names = (item: Item) => [item.path];
  const size = (item: Item) => item.bytes;
  assert.deepEqual(keptSizes([{ name: "small.png", reason: "in use" }], items, names, size), [20]);
  assert.deepEqual(keptSizes([{ path: "/Users/a/Downloads/big.mov", reason: "x" }], items, names, size), [300]);
  assert.deepEqual(
    keptSizes(["The remaining cleanup allowance cannot cover this item."], items, names, size),
    [300, 20],
  );
  assert.deepEqual(keptSizes([{ name: "elsewhere.txt" }], items, names, size), [300, 20]);
  assert.deepEqual(keptSizes([], items, names, size), []);
  assert.deepEqual(keptSizes(undefined, items, names, size), []);
});

test("prices are the feed's, else the app's bundled ones, never $0", () => {
  const live = pricesFromFeed({
    currency: "usd",
    one_time: { price: 39.99 },
    rent_to_own: { monthly: 9.99, payments_to_own: 4 },
  });
  assert.deepEqual(live, {
    currency: "USD",
    oneTime: "$39.99",
    monthly: "$9.99",
    paymentsToOwn: 4,
    monthlyTotal: "$39.96",
  });
  const broken = pricesFromFeed({ one_time: { price: 0 }, rent_to_own: { monthly: "9.99", payments_to_own: 0 } });
  assert.equal(broken.oneTime, money(BUNDLED_PRICES.oneTime));
  assert.equal(broken.monthly, money(BUNDLED_PRICES.monthly));
  assert.equal(broken.paymentsToOwn, BUNDLED_PRICES.paymentsToOwn);
  assert.equal(pricesFromFeed(undefined).oneTime, "$39.99");
  assert.equal(money(40), "$40");
});

test("two tiles in the page's order: One-Time on ↵, Rent to Own on ⌘↵ with its terms", () => {
  const tiles = planTiles(pricesFromFeed(undefined));
  assert.deepEqual(
    tiles.map((tile) => [tile.mode, tile.price, tile.suffix, tile.line, tile.key]),
    [
      ["one_time", "$39.99", undefined, "Pay once", "↵"],
      ["rent_to_own", "$9.99", "×4", "Monthly, then yours", "⌘ ↵"],
    ],
  );
  assert.equal(tiles[0].terms, "Every 1.x update · 30-day refund · plus tax");
  assert.equal(tiles[1].terms, "4 payments, $39.96 total · then billing stops · plus tax");
  // Terms break only at their own separators, never inside a phrase.
  for (const line of wrapTerms(tiles[1].terms, 138, 10.5)) assert.ok(tiles[1].terms.includes(line), line);
});

test("ready now: Mint's figure and split when it sent them, else the saved groups'", () => {
  const answer = { ready: { safeToCleanBytes: 1_800_000_000, optimizableBytes: 4_200_000_000, measured: true }, value };
  assert.deepEqual(readyNow(answer), {
    bytes: 6_000_000_000,
    optimizableBytes: 4_200_000_000,
    safeToCleanBytes: 1_800_000_000,
  });
  const saved = readyNow(undefined, { optimizableBytes: 2e9, safeToCleanBytes: 1e9 });
  assert.deepEqual(saved, { bytes: 3e9, optimizableBytes: 2e9, safeToCleanBytes: 1e9 });
  assert.deepEqual(
    readyParts(saved).map((part) => part.title),
    ["Optimizable", "Safe to clean"],
  );
  assert.deepEqual(
    readyParts(readyNow(undefined, { optimizableBytes: 0, safeToCleanBytes: 5e8 })).map((p) => p.title),
    ["Safe to clean"],
  );
});

test("a value is drawn only with its figure, its words and both lines", () => {
  assert.ok(usableValue(value));
  assert.equal(usableValue(null), undefined);
  assert.equal(usableValue({ ...value, worth: Number.NaN }), undefined);
  assert.equal(usableValue({ ...value, chart: { ...value.chart, mint: [[0, 1]] } }), undefined);
  assert.equal(
    isDrawableChart({
      ...value.chart,
      never: [
        [0, 1],
        [1, Number.POSITIVE_INFINITY],
      ],
    }),
    false,
  );
  // The footer: "so far" only above 0 (the page's row 5), then the month's figure.
  assert.deepEqual(valueFooter(value), [
    { figure: "3.53 GB", label: "so far" },
    { figure: "5 GB", label: "a month" },
  ]);
  assert.deepEqual(valueFooter({ ...value, counts: [] }), [{ figure: "5 GB", label: "a month" }]);
});

test("the gap's figure sits between the lines, or is left out", () => {
  const box = gapLabelBox(value.chart.mint, value.chart.never, 320, { width: 70, height: 11 });
  assert.ok(box);
  assert.ok(box!.x >= 0.58 * 320 && box!.x + 35 <= 310);
  const flat = chart(2);
  assert.equal(gapLabelBox(flat.mint, flat.never, 320, { width: 70, height: 11 }), undefined);
});

const input = (withValue: boolean, appearance: "dark" | "light" = "dark") => ({
  appearance,
  format: formatBytes,
  title: WORDS.title,
  status: statusLine({ plan: false, remainingCleanupBytes: 0 }),
  value: withValue
    ? {
        title: WORDS.valueTitle,
        estimate: WORDS.estimate,
        worthText: value.worthText,
        line: WORDS.valueLine,
        chart: value.chart,
        gapLabel: value.gapLabel,
        withMint: WORDS.withMint,
        neverClean: WORDS.neverClean,
        today: WORDS.today,
        threeYears: WORDS.threeYears,
        sentence: WORDS.sentence,
        footer: valueFooter(value),
      }
    : undefined,
  ready: {
    bytes: 6e9,
    figure: "6 GB",
    label: WORDS.readyNow,
    parts: readyParts(readyNow(undefined, { optimizableBytes: 4.2e9, safeToCleanBytes: 1.8e9 })),
  },
  plans: planTiles(pricesFromFeed(undefined)),
});

test("the wall says what Mint did, what is waiting and the plans, in that order", () => {
  const { svg, width, height } = planWallSVG(input(true));
  const said = words(svg);
  const order = [
    "Over 3 years on this Mac",
    "$117",
    "of space back",

    "Today",
    "3 yrs",
    "190 GB back",
    "Mint gives the space back",
    "3.53 GB",
    "so far",
    "5 GB",
    "a month",
    "Go unlimited",
    "Weekly limit reached · Resets next Monday",
    "ready now",
    "Optimizable",
    "Safe to clean",
    "$39.99",
    "Pay once",
    "$9.99",
    "×4",
    "Monthly, then yours",
  ];
  let at = -1;
  for (const phrase of order) {
    const next = said.indexOf(phrase, at + 1);
    assert.ok(next > at, `${phrase} after the one before`);
    at = next;
  }
  assert.equal(width, 680);
  assert.ok(height <= 330, "fits Raycast's detail without scrolling");
  // The gap is the accent's fill; the never line dotted, as the page draws it.
  assert.match(svg, /<polygon points="[^"]+" fill="#BDFE3A" fill-opacity="0\.16"\/>/);
  assert.match(svg, /stroke-dasharray="0 4\.2"/);
  assert.match(planWallSVG(input(true, "light")).svg, /fill="#336E00" fill-opacity="0\.16"/);
});

test("without Mint's value (Mint 1.2.0): no left side, the rest the same", () => {
  const { svg, width } = planWallSVG(input(false));
  const said = words(svg);
  assert.ok(width < 680);
  assert.ok(!said.includes("Over 3 years") && !said.includes("$117") && !said.includes("so far"));
  for (const phrase of ["Go unlimited", "ready now", "Pay once", "Monthly, then yours"])
    assert.ok(said.includes(phrase), phrase);
  // Nothing known to be ready: no "0 B ready now".
  const empty = planWallSVG({ ...input(false), ready: { bytes: 0, label: WORDS.readyNow, parts: [] } });
  assert.ok(!words(empty.svg).includes("ready now"));
});

// --- Mint 1.2.0: the left side from the shared model, the website's checkout --------------------

test("the bundled model reproduces its own examples, as the website and the app do", () => {
  for (const example of BUNDLED_MODEL.examples) {
    const value = worth(BUNDLED_MODEL, example.storageGB, 0, example.monthGB);
    assert.equal(example.monthGB * BUNDLED_MODEL.months, example.keptGB);
    assert.equal(Math.round((value ?? 0) * 100), example.worthCents, JSON.stringify(example));
  }
  // A 512 GB Mac formats as 494.4 GB; the largest size prices into its own step.
  assert.equal(storageGBFor(BUNDLED_MODEL, 494_384_795_648), 512);
  assert.equal(storageGBFor(BUNDLED_MODEL, 245_000_000_000), 256);
  assert.equal(stepFor(BUNDLED_MODEL, 8000)?.from, 4000);
  assert.equal(storageGBFor(BUNDLED_MODEL, 0), undefined);
  assert.deepEqual(
    [gbLabel(180), gbLabel(5000), gbLabel(1600), dollars(116.52), dollars(110.66)],
    ["180 GB", "5 TB", "1.6 TB", "$117", "$111"],
  );
  assert.equal(gapLabel(189.53), "190 GB back");
});

test("a model from the feed is used only when it is whole", () => {
  assert.equal(usableModel(BUNDLED_MODEL), BUNDLED_MODEL);
  assert.equal(usableModel({ ...BUNDLED_MODEL, version: 2 }), undefined);
  assert.equal(usableModel({ ...BUNDLED_MODEL, storageSteps: [{ from: 512, to: 512, price: 1 }] }), undefined);
  assert.equal(usableModel(feedModel({ space_value: "nope" })), undefined);
  assert.equal(feedModel(undefined), undefined);
});

test("on Mint 1.2.0 the left side is ready now plus 5 GB a month × 36, with no so far", () => {
  const disk = 494_384_795_648;
  const nothing = modelValue({ model: BUNDLED_MODEL, capacityBytes: disk, readyBytes: 0 });
  assert.equal(nothing?.worthText, "$111");
  assert.equal(nothing?.gapLabel, "180 GB back");
  assert.equal(nothing?.soFarBytes, 0);
  assert.deepEqual(nothing && valueFooter(nothing), [{ figure: "5 GB", label: "a month" }]);
  // 6 GB ready, a wall that held 1 GB of it: counted once, never their sum (PlanPageValue.Held.at).
  const wall = modelValue({ model: BUNDLED_MODEL, capacityBytes: disk, readyBytes: 6e9, refusedBytes: 1e9 });
  assert.equal(wall?.heldBytes, 6e9);
  assert.equal(wall?.held, "waiting");
  assert.equal(wall?.gapLabel, "186 GB back");
  assert.equal(wall?.worthText, dollars((186 * 300) / 488));
  // A selection larger than what is ready is the figure.
  assert.equal(
    modelValue({ model: BUNDLED_MODEL, capacityBytes: disk, readyBytes: 1e9, refusedBytes: 4e9 })?.heldBytes,
    4e9,
  );
  // No disk size, no column (the page's rule).
  assert.equal(modelValue({ model: BUNDLED_MODEL, readyBytes: 6e9 }), undefined);
  // The chart is the page's drawing: a tooth per step, Never clean opened by what is ready.
  const chart = wall!.chart;
  assert.ok(isDrawableChart(chart));
  assert.equal(chart.mint.length, 121);
  assert.equal(chart.never.length, 65);
  assert.deepEqual(chart.mint[0], [0, 16]);
  assert.ok(chart.never[0][1] > 16, "the gap is already open at today");
  assert.deepEqual(roomChart(BUNDLED_MODEL, 5, 0, 180).never[0], [0, 16]);
});

test("on Mint 1.2.0 a press opens the website's checkout handoff, labelled Raycast", () => {
  const feed = {
    one_time: { checkout_url: "https://pay.dzgapp.com/checkout/buy/7c6a3d82?enabled=1368304" },
    rent_to_own: { checkout_url: "https://pay.dzgapp.com/checkout/buy/546aa2f9?enabled=1525994" },
  };
  const one = new URL(purchaseURL(feed, "one_time"));
  assert.equal(`${one.origin}${one.pathname}`, "https://mintstorage.app/r/purchase/");
  assert.equal(one.searchParams.get("enabled"), "1368304");
  for (const [key, value] of Object.entries(ORDER_LABELS))
    assert.equal(one.searchParams.get(`checkout[custom][${key}]`), value);
  assert.equal(new URL(purchaseURL(feed, "rent_to_own")).searchParams.get("enabled"), "1525994");
  // No feed, or a checkout on someone else's host: the plans page, still labelled Raycast.
  assert.equal(purchaseURL(undefined, "one_time"), PRICING_PAGE_URL);
  assert.equal(
    purchaseURL({ one_time: { checkout_url: "https://evil.example/?enabled=1" } }, "one_time"),
    PRICING_PAGE_URL,
  );
  assert.equal(new URL(PRICING_PAGE_URL).searchParams.get("utm_source"), "Raycast");
});

// --- After the VM's real captures (2026-11-10): no hole when nothing is ready ---

/** Every <text>'s x and its anchor, to keep the words inside the card. */
const textBoxes = (svg: string) =>
  [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*?(?: font-size="([\d.]+)")?[^>]*>([^<]*)<\/text>/g)].map(
    (m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
      words: m[4],
    }),
  );

test("nothing ready: the page's comparison rows take ready now's place, never a hole", () => {
  for (const withValue of [true, false]) {
    for (const appearance of ["dark", "light"] as const) {
      const { svg } = planWallSVG({
        ...input(withValue, appearance),
        status: statusLine({ plan: false, remainingCleanupBytes: 1_000_000_000 }),
        ready: { bytes: 0, label: WORDS.readyNow, parts: [] },
        unlocks: unlockRows(),
      });
      const said = words(svg);
      assert.ok(!said.includes("ready now"));
      for (const phrase of [
        "1 GB of free care left · Resets next Monday",
        "Cleanup + Organize",
        "1 GB/wk",
        "∞",
        "Auto Care",
        "Pauses",
        "Non-stop",
        "$39.99",
        "Pay once",
      ]) {
        assert.ok(said.includes(phrase), `${phrase} (${withValue ? "1.2.1" : "1.2.0"}, ${appearance})`);
      }
      // The rows sit between the week's line and the plans.
      const at = (phrase: string) => textBoxes(svg).find((box) => box.words === phrase)?.y ?? -1;
      assert.ok(at("Cleanup + Organize") > at("Go unlimited") && at("Auto Care") < at("$39.99"));
    }
  }
  // With something ready, the rows stay out: ready now is the page's line there.
  const { svg } = planWallSVG({ ...input(true), unlocks: unlockRows() });
  assert.ok(words(svg).includes("ready now") && !words(svg).includes("Cleanup + Organize"));
});

test("every word of the wall sits inside its picture, ready or not", () => {
  for (const ready of [true, false]) {
    for (const withValue of [true, false]) {
      const base = input(withValue);
      const { svg, width, height } = planWallSVG({
        ...base,
        ready: ready ? base.ready : { bytes: 0, label: WORDS.readyNow, parts: [] },
        unlocks: unlockRows(),
      });
      for (const box of textBoxes(svg)) {
        assert.ok(box.x >= 0 && box.x <= width && box.y > 0 && box.y < height, `${box.words} at ${box.x},${box.y}`);
      }
    }
  }
});
