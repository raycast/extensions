# Raycast-Slurm

Manage [Slurm Workload Manager](https://github.com/schedmd/slurm) jobs across multiple clusters and inspect utilization from Raycast.

## Requirements

- SSH access to one or multiple Slurm clusters
- The clusters must be defined as a `Host` entry in `~/.ssh/config`

## Getting Started

1. Install extension **Slurm** from the Raycast extension store
2. Open **Select Clusters** and press `↵` on all clusters you wanna monitor. If a password or 2FA prompt is needed, a Terminal window opens automatically — log in there, close terminal, then return to Raycast
3. Use any other command — they will run for all active clusters

## Commands

| Command             | Description                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| **My Slurm Jobs**   | Your jobs with status, elapsed time, resource usage, logs, and cancel option |
| **All Slurm Jobs**  | Same view for all jobs                                                       |
| **HPC Info**        | Hardware information for all compute nodes                                   |
| **HPC Util**        | Live per-node CPU load, memory utilization and GPU allocation                |
| **Slurm Menu Bar**  | Running and pending job counts in the macOS menu bar                         |
| **Select Clusters** | Activate or deactivate SSH connections to your clusters                      |

## Preferences

| Preference          | Default | Description                                                                               |
| ------------------- | ------- | ----------------------------------------------------------------------------------------- |
| **Control Persist** | `12h`   | How long the SSH connection stays alive after the last command (OpenSSH `ControlPersist`) |

## Multiple Clusters

You can keep several clusters active at once. All data pages show one section per active cluster. Press `↵` on a cluster in **Select Clusters** to toggle it; this keeps the SSH connection alive so re-activation is instant. Use `⌘⇧X` to fully close the connection and logout.
