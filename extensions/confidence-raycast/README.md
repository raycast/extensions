# Confidence

Raycast extension for A/B-test statistics: confidence intervals, p-values, and sample-size planning.

## Features

- **Analyze results** — one-proportion z-test (single rate vs hypothesized target), two-proportion z-test (conversion / churn), or Welch's two-sample t-test (continuous metrics).
- **Plan sample size** — required `n` for one- or two-sample tests given baseline, MDE (relative or absolute), α, and power. Optional daily-users field estimates test duration.
- **Formula reference** — opens `MATH_101.md` fully rendered, with every LaTeX expression converted to SVG via MathJax at runtime and cached on disk. Trigger with `⌘R` from the form.

## Use cases

- A/B tests on conversion rate, churn rate, click-through rate, retention.
- Single-sample checks: "is our observed conversion rate significantly different from the 8% SLA?"
- Continuous metrics: revenue per user, days-to-churn, session length.
- Pre-experiment sizing: "how many users do I need to detect a 10% relative reduction in churn?"

## Math

Every formula used by the plugin lives in [`MATH_101.md`](MATH_101.md): the standard normal CDF/inverse, Student's t CDF/inverse, one-proportion z-test (Wald CI, null-variance SE for the p-value), two-proportion z-test (pooled SE for the p-value, unpooled SE for the CI), Welch's t-test with Welch–Satterthwaite df, and the matching sample-size formulas.

The same document renders inside the extension via the **Formula Reference** action.

## Development

```bash
npm install
npm run dev
```

`npm run dev` and `npm run build` automatically run `scripts/sync-math.mjs` first, which regenerates `src/math/content.ts` from `MATH_101.md` so the in-app reference stays in sync.

## License

MIT
