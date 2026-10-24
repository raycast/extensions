# Slurm Changelog

## [Live Job View & Utilization] - 2026-06-16

- New **Live Job View**: press `↵` on any job to open a detail view with live per-job **GPU, CPU, and memory utilization** (sampled once per second via a persistent `srun --overlap` step) alongside run and trailing-window averages
- Job detail is organized into navigable sections — Info (GPUs / VRAM / CPUs allocation), Schedule, Utilization, Output (stdout), and Error (stderr)
- **Built-in log reader**: stream a job's stdout/stderr `tail` directly in Raycast, with copy actions for the file path and buffered output
- **Improved usability**:
  - Full search across **My Slurm Jobs**, **All Slurm Jobs**, and **HPC Util** (search now matches every loaded row, not just the visible page)
  - Pagination in the job lists so large, cluster-wide job sets render smoothly
  - Cluster filter dropdown to focus a view on a single active cluster
  - Clearer GPU display: typed GPU models (e.g. `Rtx Pro 6000`) and VRAM resolved from `AllocTRES`/`ReqTRES`

## [Initial Version] - 2026-06-11

- First public release of the Slurm extension for Raycast
- Manage Slurm jobs across multiple clusters via SSH
- Commands: My Slurm Jobs, All Slurm Jobs, HPC Info, HPC Util, Slurm Menu Bar, Select Clusters
- macOS menu bar shows running and pending job counts across active clusters
- Multi-cluster support with persistent SSH connections (configurable `ControlPersist`)
