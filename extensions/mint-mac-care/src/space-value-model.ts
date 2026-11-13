// The plan page's value model, the same file the app bundles and the website's Pricing reads
// (website/src/data/space-value-model.json, 2026-11-04: "one source"). Carried here verbatim so the
// plan wall can price a Mac on a Mint that cannot say it (1.2.0); /api/pricing.json's `space_value`
// replaces it when the feed answers, as it does in the app (PlanPricing). test/mint-swift-parity
// fails if this copy and the website's file ever differ. The functions are SpaceValueModel's
// (Mint/Engine/PlanPageValue.swift) and PlanPageRoomChart.Geometry's
// (Mint/Views/PlanPageValueColumn.swift), each checked against the file's own examples or the Swift.

export type SpaceValueModel = {
  version: number;
  checkedOn: string;
  storeURL?: string;
  months: number;
  monthGB: { min: number; max: number; default: number };
  slider: { steps: number; curve: number; snap: Array<{ below?: number; step: number }> };
  storageSteps: Array<{ from: number; to: number; price: number }>;
  examples: Array<{ storageGB: number; monthGB: number; keptGB: number; worthCents: number }>;
};

export const BUNDLED_MODEL: SpaceValueModel = {
  version: 1,
  checkedOn: "2026-11-02",
  storeURL: "https://www.apple.com/shop/buy-mac",
  months: 36,
  monthGB: {
    min: 1,
    max: 200,
    default: 5,
  },
  slider: {
    steps: 1000,
    curve: 2.2,
    snap: [
      {
        below: 20,
        step: 1,
      },
      {
        below: 100,
        step: 5,
      },
      {
        step: 10,
      },
    ],
  },
  storageSteps: [
    {
      from: 256,
      to: 512,
      price: 200,
    },
    {
      from: 512,
      to: 1000,
      price: 300,
    },
    {
      from: 1000,
      to: 2000,
      price: 500,
    },
    {
      from: 2000,
      to: 4000,
      price: 1000,
    },
    {
      from: 4000,
      to: 8000,
      price: 2000,
    },
  ],
  examples: [
    {
      storageGB: 512,
      monthGB: 5,
      keptGB: 180,
      worthCents: 11066,
    },
    {
      storageGB: 512,
      monthGB: 140,
      keptGB: 5040,
      worthCents: 309836,
    },
    {
      storageGB: 256,
      monthGB: 7,
      keptGB: 252,
      worthCents: 19688,
    },
    {
      storageGB: 1000,
      monthGB: 20,
      keptGB: 720,
      worthCents: 36000,
    },
    {
      storageGB: 2000,
      monthGB: 1,
      keptGB: 36,
      worthCents: 1800,
    },
    {
      storageGB: 4000,
      monthGB: 200,
      keptGB: 7200,
      worthCents: 360000,
    },
    {
      storageGB: 8000,
      monthGB: 50,
      keptGB: 1800,
      worthCents: 90000,
    },
  ],
};

/** SpaceValueModel.isUsable: anything out of range keeps the copy in hand; a malformed price never draws a figure. */
export function usableModel(value: unknown): SpaceValueModel | undefined {
  const model = value as SpaceValueModel | undefined;
  const ok =
    model?.version === 1 &&
    Number.isInteger(model.months) &&
    model.months >= 1 &&
    model.months <= 120 &&
    model.monthGB?.min >= 1 &&
    model.monthGB.min <= model.monthGB.default &&
    model.monthGB.default <= model.monthGB.max &&
    model.slider?.steps > 0 &&
    model.slider.curve > 0 &&
    Array.isArray(model.slider.snap) &&
    model.slider.snap.length > 0 &&
    Array.isArray(model.storageSteps) &&
    model.storageSteps.length > 0 &&
    model.storageSteps.every((step) => step.to > step.from && step.price > 0);
  return ok ? model : undefined;
}

/** Apple's step above `storageGB`, or the one into it for the largest size (SpaceValueModel.step). */
export function stepFor(model: SpaceValueModel, storageGB: number) {
  return (
    model.storageSteps.find((step) => step.from === storageGB) ??
    model.storageSteps.find((step) => step.to === storageGB) ??
    undefined
  );
}

/** The Apple size this disk was sold as, in decimal GB (SpaceValueModel.storageGB): 494.4 GB is a 512 GB Mac. */
export function storageGBFor(model: SpaceValueModel, capacityBytes: number): number | undefined {
  const sizes = [...new Set(model.storageSteps.flatMap((step) => [step.from, step.to]))].sort((a, b) => a - b);
  if (!sizes.length || !(capacityBytes > 0)) return undefined;
  const gb = capacityBytes / 1e9;
  return sizes.find((size) => gb <= size) ?? sizes[sizes.length - 1];
}

/** What is back or ready now, counted once, plus what is new each month over the months (11-06). */
export function keptGB(model: SpaceValueModel, backlogGB: number, monthGB: number): number {
  return Math.max(0, backlogGB) + monthGB * model.months;
}

/** The 3-year figure in dollars at this Mac's step; undefined for a size Apple has no step for. */
export function worth(
  model: SpaceValueModel,
  storageGB: number,
  backlogGB: number,
  monthGB: number,
): number | undefined {
  const step = stepFor(model, storageGB);
  return step ? (keptGB(model, backlogGB, monthGB) * step.price) / (step.to - step.from) : undefined;
}

/** "$117": PlanPageValueColumn.dollars, US dollars, no cents, half away from zero. */
export function dollars(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

/** "180 GB", "5 TB", "1.6 TB": PlanPageValueColumn.gbLabel. */
export function gbLabel(gb: number): string {
  if (gb < 1000) return `${gb} GB`;
  const tb = (gb / 1000).toFixed(1);
  return `${tb.endsWith(".0") ? tb.slice(0, -2) : tb} TB`;
}

/** The chart's figure, "190 GB back": PlanPageValueColumn.gapLabel in English. */
export function gapLabel(kept: number): string {
  return `${gbLabel(Math.round(Math.max(0, kept)))} back`;
}

/**
 * The plan page's chart in its own frame, 320 × 124 (PlanPageRoomChart.Geometry at scale 1, `lines()`):
 * With Mint nearly level with a tooth per step, Never clean falling from a gap already open at
 * today by what is back or ready now. Mint 1.2.1 sends these points itself (`plan.value`).
 */
export const ROOM_CHART = { width: 320, height: 124, top: 16, own: 10, axis: 108, teeth: 60 } as const;

export function roomChart(model: SpaceValueModel, monthGB: number, backlogGB: number, kept: number) {
  const { width, top, own: ownSpan, teeth } = ROOM_CHART;
  const maxKept = model.monthGB.max * model.months;
  const fall = 44 + 26 * Math.min(1, Math.pow(Math.max(0, kept) / maxKept, 0.4));
  const depth = 1.4 + 1.6 * Math.min(1, Math.pow(monthGB / model.monthGB.max, 0.5));
  const atToday = kept > 0 ? Math.min(1, Math.max(0, backlogGB / kept)) : 0;
  const own = (t: number) => top + ownSpan * t;
  const never = (t: number) => top + ownSpan * t + fall * (atToday + (1 - atToday) * Math.pow(t, 1.8));
  const tooth = (t: number) => Math.min(own(t) + depth, (own(t) + never(t)) / 2);
  const point = (t: number, y: number) => [Math.round(width * t * 10) / 10, Math.round(y * 10) / 10];
  const mint = [point(0, own(0))];
  for (let index = 0; index < teeth; index += 1) {
    const start = index / teeth;
    const step = 1 / teeth;
    mint.push(point(start + step * 0.82, tooth(start + step * 0.82)), point(start + step, own(start + step)));
  }
  const neverLine = Array.from({ length: 65 }, (_, index) => point(index / 64, never(index / 64)));
  return { width, height: ROOM_CHART.height, top, axis: ROOM_CHART.axis, mint, never: neverLine };
}
