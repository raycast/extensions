# Sequential benchmark calibration

_Calibration date: 2026-08-25_

## Available hardware

- MacBook Pro with Apple M5 Pro
- Internal 1 TB Apple NVMe SSD on APFS
- No external physical disks were attached, so external SSD, HDD, and flash-drive validation remains open.

## Method

The native benchmark core was run three times at each candidate cap. Every run used:

- `F_NOCACHE` on write and read file descriptors
- `F_FULLFSYNC` inside measured write duration
- 32 MiB unmeasured warm-up
- 4 MiB cancellable I/O chunks
- 64 MiB stability windows
- deterministic high-entropy data
- 10-second configured transfer target, checked between chunks with the final durability flush included in write time

These calibration runs predate the migration from a committed universal executable to Raycast's source-built Swift integration. The measurement core and methodology were unchanged by that packaging migration.

## Internal-volume results

Throughput uses decimal MB/s. CV is the coefficient of variation across the three complete runs.

| Cap | Mean write | Write CV | Mean read | Read CV |
| ---: | ---: | ---: | ---: | ---: |
| 256 MiB | 1,878 MB/s | 2.2% | 12,297 MB/s | 1.8% |
| 512 MiB | 6,797 MB/s | 3.8% | 12,277 MB/s | 9.5% |
| 1,024 MiB | 8,785 MB/s | 3.4% | 11,617 MB/s | 13.3% |
| 2,048 MiB | 10,029 MB/s | 1.2% | 12,145 MB/s | 8.3% |

No benchmark temporary files remained after calibration.

A read-only `/System` destination produced a structured `benchmark_failed` event and did not leave a benchmark file. On 2026-08-26, the Raycast source-built Swift bridge completed a live 256 MiB development run at 1,905 MB/s write and 11,496 MB/s read, showed native progress, retained no temporary benchmark file, and recorded the result in history. This smoke run is not included in the three-run calibration means above.

## Decision

Use **256 MiB** as the v1 default because it is the smallest tested cap and the only available-hardware candidate with less than 5% run-to-run variation in both directions. Keep larger caps as advanced preferences. The 5 GiB, 10 GiB, and 25 GiB sustained-transfer options were added after this calibration and remain uncalibrated. Results remain comparable only when methodology and material configuration match; the fixed cost of a durable write flush particularly affects comparisons across different caps.

## Remaining validation

Before opening a public Raycast Store pull request, repeat the matrix on an external fast SSD and representative slower removable storage. Compare ordering and repeatability, not numerical equivalence with another benchmark.
