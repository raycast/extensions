# Local LaTeX OCR Benchmark

Generated: 2026-09-12T10:48:54.907Z

Corpus: 150 deterministic printed formulas across 10 categories and 5 image variants. This synthetic corpus is a development baseline, not a substitute for a real paper/PDF validation set.

| Metric | Result | v1 gate |
|---|---:|---:|
| Normalized exact match | 54.7% | 85% |
| KaTeX render-equivalent | 52.0% | 90% |
| Syntax-valid | 80.7% | 95% |
| Session load | 1902 ms | — |
| Warm p50 | 1097 ms | ≤2000 ms |
| Warm p95 | 1631 ms | ≤5000 ms |
| Cold load + first inference | 3115 ms | ≤10000 ms |
| Peak RSS | 1701 MiB | ≤750 MiB |

Backend selected: cpu.

## Confidence calibration

Best grid point with at least 95% render-equivalent precision: mean ≥ 1.000, minimum ≥ 1.000; precision n/a, coverage 0.0%.

Machine: darwin arm64, v26.7.0.
