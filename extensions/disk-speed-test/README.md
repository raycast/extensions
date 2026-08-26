# Disk Speed Test for Raycast

Disk Speed Test is a macOS Raycast extension for checking sequential write and read performance on local storage. It provides a short, conservative test, understandable task-oriented context, and private per-volume history without claiming to diagnose hardware health.

## Commands

- **Run Disk Speed Test** measures sequential write and read throughput with live progress and cancellation.
- **View Disk Speed History** reviews compatible results, provisional/confirmed baselines, confidence, and recent failures.

Opening the command shows the selected folder, data limit, time target, and safeguards before any test data is written. Press Enter on any configuration row to change that value, or choose **Start Test** to confirm the reviewed setup. **Configure Test** changes both limits together, while **Configure and Run** is available after a result. Per-run limits range from 256 MiB–25 GiB and 3 seconds–1 minute per measured phase.

## How the benchmark works

The extension includes a small, open-source Swift package that Raycast compiles as part of the extension build. The native benchmark creates a private temporary file in the selected folder, applies macOS `F_NOCACHE`, writes deterministic high-entropy data with aligned buffers, reads it back, publishes versioned progress snapshots, and removes the file.

The normal test is bounded by both the configured file size and a maximum transfer target. The native benchmark checks elapsed time between aligned chunks and includes the final durability flush in the reported write duration; macOS may finish an in-flight filesystem call after the target rather than truncating or falsifying the measurement. Choosing **Cancel Test** creates a private cancellation marker checked between chunks. The Swift process also handles termination signals from Raycast, and both Swift and TypeScript perform exact-file cleanup. On the next run, the extension defensively removes only old regular files that match its exact private UUID filename pattern.

Task tiers are broad examples. They are not guarantees for a codec, application, or frame rate. Throughput results cannot establish the physical health of a disk.

## Privacy and permissions

- Results, volume identity, and settings stay in Raycast's local storage.
- No analytics or telemetry are collected.
- Test data and sampled contents are never transmitted or retained.
- The extension requests only normal filesystem access to the selected location. Some removable or protected folders may require granting Raycast access in macOS System Settings.
- Network and cloud-backed paths are outside the v1 support boundary.

## Development

Requirements:

- macOS with Xcode 16.3 or newer
- Node.js 22.22.2 or newer
- Raycast

Install and verify:

```bash
npm install
npm run test:helper
npm test
npm run typecheck
npm run lint
npm run build
```

`ray build` discovers `native/DiskSpeedHelper/Package.swift`, compiles the `DiskSpeedHelper` executable through Raycast's Swift build integration, and generates the TypeScript bridge used by the command. No precompiled executable is committed to the extension.

Native benchmarks are selected through the `BenchmarkCase` registry (`sequential` in v1), so future I/O cases can be added without changing process management or the Raycast command layer.

## License

MIT
