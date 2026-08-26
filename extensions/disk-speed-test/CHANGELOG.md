# Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Measure sequential write and read performance on local macOS volumes.
- Review the selected disk, data limit, and time target before explicitly starting a test, with contextual Enter-key pickers for each setting.
- Choose per-run data limits from 256 MiB to 25 GiB and time targets from 3 seconds to 1 minute.
- Benchmark writable external volumes, including ExFAT NVMe drives, with filesystem-aware free-space checks.
- Follow live benchmark progress with cancellation and automatic temporary-file cleanup.
- Compile the included Swift benchmark source through Raycast's native extension tooling.
- Review Raycast-native results with confidence, workload guidance, and compatible baselines.
- Keep a private, bounded history per volume without telemetry or network requests.
