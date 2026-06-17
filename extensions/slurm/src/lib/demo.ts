/**
 * Demo mode for Raycast extension store screenshots.
 *
 * Toggle ON:
 *     touch ~/.raycast-slurm-demo
 *     then reload the extension in Raycast (⌘R) or restart `npm run dev`
 *
 * Toggle OFF:
 *     rm ~/.raycast-slurm-demo
 *     then reload the extension in Raycast (⌘R) or restart `npm run dev`
 *
 * (Env vars like RAYCAST_SLURM_DEMO=1 don't reach the extension worker —
 * Raycast spawns it from Raycast.app, not from the npm shell — so we use
 * a marker file instead. As a manual override, you can also flip
 * FORCE_DEMO below to true.)
 *
 * When DEMO_MODE is on:
 *   - SSH calls are intercepted in runSsh() and never touch the network
 *   - listHosts() returns two fictional clusters (phoenix, nimbus)
 *   - getActiveHosts() defaults to both demo hosts
 *
 * Mock data flows through the real parsers (parseJobRow, parseNodeLine,
 * tokenizeKv), so any drift in expected wire formats surfaces immediately.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Host } from "./ssh-config";
import type { MetricSample } from "./metrics";

const FORCE_DEMO = false; // flip to true for an unconditional override
const MARKER_FILE = path.join(os.homedir(), ".raycast-slurm-demo");

function detectDemoMode(): boolean {
  if (FORCE_DEMO) return true;
  if (process.env.RAYCAST_SLURM_DEMO === "1") return true;
  try {
    return fs.existsSync(MARKER_FILE);
  } catch {
    return false;
  }
}

export const DEMO_MODE = detectDemoMode();

export const DEMO_USER = "r.shaw";

export const DEMO_HOSTS: Host[] = [
  { name: "phoenix", hostName: "phoenix.hpc.example.edu", user: DEMO_USER },
  { name: "nimbus", hostName: "nimbus.hpc.example.edu", user: DEMO_USER },
];

export function isDemoHost(host: string): boolean {
  return DEMO_HOSTS.some((h) => h.name === host);
}

// ---------- types ----------

type MockJob = {
  jobId: string;
  partition: string;
  name: string;
  state: string;
  elapsed: string;
  timeLimit: string;
  nodes: string;
  cpus: string;
  reasonOrNodeList: string;
  user: string;
  tres: string; // AllocTRES, surfaces in the right-hand column of the job row
};

type MockNode = {
  name: string;
  state: string;
  partitions: string[];
  cpuLoad: number | null;
  cpuTot: number;
  cpuAlloc: number;
  realMemoryMB: number;
  freeMemoryMB: number;
  allocMemoryMB: number;
  gres?: string;
  gresUsed?: string;
  allocTres?: string;
  features?: string;
  reason?: string;
};

// ---------- phoenix: GPU cluster, 16 nodes ----------

// Authored by hand so screenshots are deterministic. Mix of states/users/GPUs.
const PHOENIX_JOBS: MockJob[] = [
  // r.shaw's jobs
  {
    jobId: "145782",
    partition: "gpu-long",
    name: "train_llama_70b",
    state: "RUNNING",
    elapsed: "2-14:23:11",
    timeLimit: "7-00:00:00",
    nodes: "2",
    cpus: "192",
    reasonOrNodeList: "gpu[01-02]",
    user: DEMO_USER,
    tres: "cpu=192,mem=1280G,node=2,gres/gpu=14,gres/gpu:h100=14",
  },
  {
    jobId: "145789",
    partition: "gpu",
    name: "bert_finetune",
    state: "RUNNING",
    elapsed: "0:45:23",
    timeLimit: "12:00:00",
    nodes: "1",
    cpus: "16",
    reasonOrNodeList: "gpu11",
    user: DEMO_USER,
    tres: "cpu=16,mem=64G,node=1,gres/gpu=1,gres/gpu:a100=1",
  },
  {
    jobId: "145791",
    partition: "gpu",
    name: "vit_pretrain",
    state: "RUNNING",
    elapsed: "6:12:48",
    timeLimit: "1-00:00:00",
    nodes: "1",
    cpus: "32",
    reasonOrNodeList: "gpu07",
    user: DEMO_USER,
    tres: "cpu=32,mem=180G,node=1,gres/gpu=2,gres/gpu:h100=2",
  },
  {
    jobId: "145812",
    partition: "gpu-long",
    name: "sd3_finetune",
    state: "RUNNING",
    elapsed: "18:34:02",
    timeLimit: "3-00:00:00",
    nodes: "1",
    cpus: "48",
    reasonOrNodeList: "gpu12",
    user: DEMO_USER,
    tres: "cpu=48,mem=320G,node=1,gres/gpu=3,gres/gpu:a100=3",
  },
  {
    jobId: "145823",
    partition: "gpu",
    name: "llava_finetune",
    state: "RUNNING",
    elapsed: "2:14:35",
    timeLimit: "18:00:00",
    nodes: "1",
    cpus: "8",
    reasonOrNodeList: "gpu14",
    user: DEMO_USER,
    tres: "cpu=8,mem=80G,node=1,gres/gpu=1,gres/gpu:a100=1",
  },
  {
    jobId: "145847",
    partition: "gpu",
    name: "diffusion_eval",
    state: "PENDING",
    elapsed: "0:00",
    timeLimit: "2:00:00",
    nodes: "1",
    cpus: "8",
    reasonOrNodeList: "(Resources)",
    user: DEMO_USER,
    tres: "cpu=8,mem=64G,node=1,gres/gpu=2,gres/gpu:a100=2",
  },
  {
    jobId: "145849",
    partition: "gpu",
    name: "sweep_lr_007",
    state: "PENDING",
    elapsed: "0:00",
    timeLimit: "6:00:00",
    nodes: "1",
    cpus: "4",
    reasonOrNodeList: "(Priority)",
    user: DEMO_USER,
    tres: "cpu=4,mem=32G,node=1,gres/gpu=1,gres/gpu:a100=1",
  },
  {
    jobId: "145855",
    partition: "debug",
    name: "model_export",
    state: "COMPLETING",
    elapsed: "0:08:42",
    timeLimit: "0:30:00",
    nodes: "1",
    cpus: "2",
    reasonOrNodeList: "gpu14",
    user: DEMO_USER,
    tres: "cpu=2,mem=16G,node=1,gres/gpu=1,gres/gpu:a100=1",
  },
  // other users
  {
    jobId: "145701",
    partition: "gpu-long",
    name: "train_dalle3",
    state: "RUNNING",
    elapsed: "3-08:14:22",
    timeLimit: "7-00:00:00",
    nodes: "1",
    cpus: "96",
    reasonOrNodeList: "gpu03",
    user: "alice.chen",
    tres: "cpu=96,mem=720G,node=1,gres/gpu=8,gres/gpu:h100=8",
  },
  {
    jobId: "145756",
    partition: "gpu",
    name: "whisper_finetune",
    state: "RUNNING",
    elapsed: "14:23:01",
    timeLimit: "1-00:00:00",
    nodes: "1",
    cpus: "16",
    reasonOrNodeList: "gpu09",
    user: "bob.park",
    tres: "cpu=16,mem=128G,node=1,gres/gpu=2,gres/gpu:a100=2",
  },
  {
    jobId: "145773",
    partition: "gpu",
    name: "qwen_dpo",
    state: "RUNNING",
    elapsed: "8:42:15",
    timeLimit: "2-00:00:00",
    nodes: "1",
    cpus: "32",
    reasonOrNodeList: "gpu01",
    user: "c.dubois",
    tres: "cpu=32,mem=200G,node=1,gres/gpu=1,gres/gpu:h100=1",
  },
  {
    jobId: "145817",
    partition: "gpu",
    name: "protein_fold",
    state: "RUNNING",
    elapsed: "11:42:33",
    timeLimit: "2-00:00:00",
    nodes: "1",
    cpus: "32",
    reasonOrNodeList: "gpu04",
    user: "g.nikolov",
    tres: "cpu=32,mem=240G,node=1,gres/gpu=4,gres/gpu:h100=4",
  },
  {
    jobId: "145840",
    partition: "gpu",
    name: "stable_video",
    state: "PENDING",
    elapsed: "0:00",
    timeLimit: "8:00:00",
    nodes: "1",
    cpus: "16",
    reasonOrNodeList: "(Resources)",
    user: "k.nakamura",
    tres: "cpu=16,mem=128G,node=1,gres/gpu=4,gres/gpu:h100=4",
  },
];

const PHOENIX_NODES: MockNode[] = [
  // H100 nodes
  {
    name: "gpu01",
    state: "MIXED",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 72.4,
    cpuTot: 128,
    cpuAlloc: 96,
    realMemoryMB: 1015808,
    freeMemoryMB: 358400,
    allocMemoryMB: 655360,
    gres: "gpu:h100:8",
    gresUsed: "gpu:h100:7",
    allocTres: "cpu=96,mem=640G,gres/gpu=7",
    features: "h100,nvlink,sxm5",
  },
  {
    name: "gpu02",
    state: "MIXED",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 68.2,
    cpuTot: 128,
    cpuAlloc: 96,
    realMemoryMB: 1015808,
    freeMemoryMB: 409600,
    allocMemoryMB: 604160,
    gres: "gpu:h100:8",
    gresUsed: "gpu:h100:7",
    allocTres: "cpu=96,mem=600G,gres/gpu=7",
    features: "h100,nvlink,sxm5",
  },
  {
    name: "gpu03",
    state: "ALLOCATED",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 124.5,
    cpuTot: 128,
    cpuAlloc: 128,
    realMemoryMB: 1015808,
    freeMemoryMB: 204800,
    allocMemoryMB: 808960,
    gres: "gpu:h100:8",
    gresUsed: "gpu:h100:8",
    allocTres: "cpu=128,mem=800G,gres/gpu=8",
    features: "h100,nvlink,sxm5",
  },
  {
    name: "gpu04",
    state: "MIXED",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 42.1,
    cpuTot: 128,
    cpuAlloc: 64,
    realMemoryMB: 1015808,
    freeMemoryMB: 614400,
    allocMemoryMB: 399360,
    gres: "gpu:h100:8",
    gresUsed: "gpu:h100:4",
    allocTres: "cpu=64,mem=400G,gres/gpu=4",
    features: "h100,nvlink,sxm5",
  },
  {
    name: "gpu05",
    state: "IDLE",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 0.04,
    cpuTot: 128,
    cpuAlloc: 0,
    realMemoryMB: 1015808,
    freeMemoryMB: 1010688,
    allocMemoryMB: 0,
    gres: "gpu:h100:8",
    gresUsed: "gpu:h100:0",
    features: "h100,nvlink,sxm5",
  },
  {
    name: "gpu06",
    state: "IDLE",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 0.02,
    cpuTot: 128,
    cpuAlloc: 0,
    realMemoryMB: 1015808,
    freeMemoryMB: 1015040,
    allocMemoryMB: 0,
    gres: "gpu:h100:8",
    gresUsed: "gpu:h100:0",
    features: "h100,nvlink,sxm5",
  },
  {
    name: "gpu07",
    state: "MIXED",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 15.8,
    cpuTot: 128,
    cpuAlloc: 32,
    realMemoryMB: 1015808,
    freeMemoryMB: 716800,
    allocMemoryMB: 296960,
    gres: "gpu:h100:8",
    gresUsed: "gpu:h100:2",
    allocTres: "cpu=32,mem=290G,gres/gpu=2",
    features: "h100,nvlink,sxm5",
  },
  {
    name: "gpu08",
    state: "DRAINED",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 0.01,
    cpuTot: 128,
    cpuAlloc: 0,
    realMemoryMB: 1015808,
    freeMemoryMB: 1015808,
    allocMemoryMB: 0,
    gres: "gpu:h100:8",
    gresUsed: "gpu:h100:0",
    features: "h100,nvlink,sxm5",
    reason: "kernel upgrade pending",
  },
  // A100 nodes
  {
    name: "gpu09",
    state: "MIXED",
    partitions: ["gpu", "gpu-long", "debug"],
    cpuLoad: 28.3,
    cpuTot: 64,
    cpuAlloc: 32,
    realMemoryMB: 510976,
    freeMemoryMB: 204800,
    allocMemoryMB: 307200,
    gres: "gpu:a100:4",
    gresUsed: "gpu:a100:2",
    allocTres: "cpu=32,mem=300G,gres/gpu=2",
    features: "a100,nvlink",
  },
  {
    name: "gpu10",
    state: "ALLOCATED",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 62.4,
    cpuTot: 64,
    cpuAlloc: 64,
    realMemoryMB: 510976,
    freeMemoryMB: 51200,
    allocMemoryMB: 460800,
    gres: "gpu:a100:4",
    gresUsed: "gpu:a100:4",
    allocTres: "cpu=64,mem=450G,gres/gpu=4",
    features: "a100,nvlink",
  },
  {
    name: "gpu11",
    state: "MIXED",
    partitions: ["gpu", "gpu-long", "debug"],
    cpuLoad: 14.2,
    cpuTot: 64,
    cpuAlloc: 16,
    realMemoryMB: 510976,
    freeMemoryMB: 358400,
    allocMemoryMB: 153600,
    gres: "gpu:a100:4",
    gresUsed: "gpu:a100:1",
    allocTres: "cpu=16,mem=150G,gres/gpu=1",
    features: "a100,nvlink",
  },
  {
    name: "gpu12",
    state: "MIXED",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 47.8,
    cpuTot: 64,
    cpuAlloc: 48,
    realMemoryMB: 510976,
    freeMemoryMB: 153600,
    allocMemoryMB: 358400,
    gres: "gpu:a100:4",
    gresUsed: "gpu:a100:3",
    allocTres: "cpu=48,mem=350G,gres/gpu=3",
    features: "a100,nvlink",
  },
  {
    name: "gpu13",
    state: "IDLE",
    partitions: ["gpu", "gpu-long", "debug"],
    cpuLoad: 0.05,
    cpuTot: 64,
    cpuAlloc: 0,
    realMemoryMB: 510976,
    freeMemoryMB: 508928,
    allocMemoryMB: 0,
    gres: "gpu:a100:4",
    gresUsed: "gpu:a100:0",
    features: "a100,nvlink",
  },
  {
    name: "gpu14",
    state: "MIXED",
    partitions: ["gpu", "debug"],
    cpuLoad: 8.4,
    cpuTot: 64,
    cpuAlloc: 8,
    realMemoryMB: 510976,
    freeMemoryMB: 409600,
    allocMemoryMB: 102400,
    gres: "gpu:a100:4",
    gresUsed: "gpu:a100:2",
    allocTres: "cpu=8,mem=100G,gres/gpu=2",
    features: "a100,nvlink",
  },
  {
    name: "gpu15",
    state: "ALLOCATED",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: 63.1,
    cpuTot: 64,
    cpuAlloc: 64,
    realMemoryMB: 510976,
    freeMemoryMB: 20480,
    allocMemoryMB: 491520,
    gres: "gpu:a100:4",
    gresUsed: "gpu:a100:4",
    allocTres: "cpu=64,mem=480G,gres/gpu=4",
    features: "a100,nvlink",
  },
  {
    name: "gpu16",
    state: "DOWN",
    partitions: ["gpu", "gpu-long"],
    cpuLoad: null,
    cpuTot: 64,
    cpuAlloc: 0,
    realMemoryMB: 510976,
    freeMemoryMB: 0,
    allocMemoryMB: 0,
    gres: "gpu:a100:4",
    gresUsed: "gpu:a100:0",
    features: "a100,nvlink",
    reason: "hardware fault GPU0",
  },
];

// ---------- nimbus: mixed CPU/GPU cluster, 24 nodes ----------

const NIMBUS_JOBS: MockJob[] = [
  // r.shaw's jobs
  {
    jobId: "92341",
    partition: "cpu",
    name: "data_preprocess",
    state: "RUNNING",
    elapsed: "1:23:45",
    timeLimit: "4:00:00",
    nodes: "1",
    cpus: "32",
    reasonOrNodeList: "cpu03",
    user: DEMO_USER,
    tres: "cpu=32,mem=128G,node=1",
  },
  {
    jobId: "92347",
    partition: "gpu",
    name: "hp_search_run3",
    state: "RUNNING",
    elapsed: "4:08:12",
    timeLimit: "12:00:00",
    nodes: "1",
    cpus: "16",
    reasonOrNodeList: "gpu02",
    user: DEMO_USER,
    tres: "cpu=16,mem=64G,node=1,gres/gpu=1,gres/gpu:l40s=1",
  },
  {
    jobId: "92352",
    partition: "cpu",
    name: "evaluate_baselines",
    state: "RUNNING",
    elapsed: "0:34:18",
    timeLimit: "2:00:00",
    nodes: "1",
    cpus: "16",
    reasonOrNodeList: "cpu07",
    user: DEMO_USER,
    tres: "cpu=16,mem=64G,node=1",
  },
  {
    jobId: "92358",
    partition: "cpu-long",
    name: "build_index",
    state: "PENDING",
    elapsed: "0:00",
    timeLimit: "1-00:00:00",
    nodes: "1",
    cpus: "48",
    reasonOrNodeList: "(AssocMaxJobsLimit)",
    user: DEMO_USER,
    tres: "cpu=48,mem=192G,node=1",
  },
  {
    jobId: "92361",
    partition: "dev",
    name: "notebook",
    state: "RUNNING",
    elapsed: "2:18:42",
    timeLimit: "8:00:00",
    nodes: "1",
    cpus: "4",
    reasonOrNodeList: "gpu05",
    user: DEMO_USER,
    tres: "cpu=4,mem=32G,node=1,gres/gpu=1,gres/gpu:l40s=1",
  },
  // other users
  {
    jobId: "92301",
    partition: "cpu-long",
    name: "sim_climate",
    state: "RUNNING",
    elapsed: "14:23:01",
    timeLimit: "1-00:00:00",
    nodes: "1",
    cpus: "48",
    reasonOrNodeList: "cpu01",
    user: "alice.chen",
    tres: "cpu=48,mem=192G,node=1",
  },
  {
    jobId: "92312",
    partition: "cpu",
    name: "geno_align",
    state: "RUNNING",
    elapsed: "3:42:18",
    timeLimit: "8:00:00",
    nodes: "1",
    cpus: "32",
    reasonOrNodeList: "cpu02",
    user: "bob.park",
    tres: "cpu=32,mem=128G,node=1",
  },
  {
    jobId: "92318",
    partition: "gpu",
    name: "tabular_train",
    state: "RUNNING",
    elapsed: "6:12:48",
    timeLimit: "12:00:00",
    nodes: "1",
    cpus: "16",
    reasonOrNodeList: "gpu01",
    user: "c.dubois",
    tres: "cpu=16,mem=96G,node=1,gres/gpu=2,gres/gpu:l40s=2",
  },
  {
    jobId: "92335",
    partition: "gpu",
    name: "cv_baseline",
    state: "RUNNING",
    elapsed: "2:14:08",
    timeLimit: "6:00:00",
    nodes: "1",
    cpus: "8",
    reasonOrNodeList: "gpu03",
    user: "g.nikolov",
    tres: "cpu=8,mem=48G,node=1,gres/gpu=1,gres/gpu:l40s=1",
  },
  {
    jobId: "92338",
    partition: "cpu",
    name: "stats_run",
    state: "COMPLETING",
    elapsed: "0:12:42",
    timeLimit: "1:00:00",
    nodes: "1",
    cpus: "8",
    reasonOrNodeList: "cpu13",
    user: "h.kowalski",
    tres: "cpu=8,mem=32G,node=1",
  },
  {
    jobId: "92355",
    partition: "gpu",
    name: "tts_finetune",
    state: "PENDING",
    elapsed: "0:00",
    timeLimit: "4:00:00",
    nodes: "1",
    cpus: "8",
    reasonOrNodeList: "(Resources)",
    user: "k.nakamura",
    tres: "cpu=8,mem=48G,node=1,gres/gpu=1,gres/gpu:l40s=1",
  },
];

const NIMBUS_NODES: MockNode[] = [
  // CPU nodes
  {
    name: "cpu01",
    state: "ALLOCATED",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 47.8,
    cpuTot: 64,
    cpuAlloc: 48,
    realMemoryMB: 257024,
    freeMemoryMB: 51200,
    allocMemoryMB: 196608,
    allocTres: "cpu=48,mem=192G",
    features: "epyc,zen4",
  },
  {
    name: "cpu02",
    state: "MIXED",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 31.4,
    cpuTot: 64,
    cpuAlloc: 32,
    realMemoryMB: 257024,
    freeMemoryMB: 128000,
    allocMemoryMB: 131072,
    allocTres: "cpu=32,mem=128G",
    features: "epyc,zen4",
  },
  {
    name: "cpu03",
    state: "MIXED",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 28.9,
    cpuTot: 64,
    cpuAlloc: 32,
    realMemoryMB: 257024,
    freeMemoryMB: 124928,
    allocMemoryMB: 131072,
    allocTres: "cpu=32,mem=128G",
    features: "epyc,zen4",
  },
  {
    name: "cpu04",
    state: "MIXED",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 30.2,
    cpuTot: 64,
    cpuAlloc: 32,
    realMemoryMB: 257024,
    freeMemoryMB: 158720,
    allocMemoryMB: 98304,
    allocTres: "cpu=32,mem=96G",
    features: "epyc,zen4",
  },
  {
    name: "cpu05",
    state: "MIXED",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 23.1,
    cpuTot: 64,
    cpuAlloc: 24,
    realMemoryMB: 257024,
    freeMemoryMB: 158720,
    allocMemoryMB: 98304,
    allocTres: "cpu=24,mem=96G",
    features: "epyc,zen4",
  },
  {
    name: "cpu06",
    state: "IDLE",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 0.12,
    cpuTot: 64,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 254976,
    allocMemoryMB: 0,
    features: "epyc,zen4",
  },
  {
    name: "cpu07",
    state: "MIXED",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 15.8,
    cpuTot: 64,
    cpuAlloc: 16,
    realMemoryMB: 257024,
    freeMemoryMB: 191488,
    allocMemoryMB: 65536,
    allocTres: "cpu=16,mem=64G",
    features: "epyc,zen4",
  },
  {
    name: "cpu08",
    state: "MIXED",
    partitions: ["cpu"],
    cpuLoad: 15.4,
    cpuTot: 64,
    cpuAlloc: 16,
    realMemoryMB: 257024,
    freeMemoryMB: 191488,
    allocMemoryMB: 65536,
    allocTres: "cpu=16,mem=64G",
    features: "epyc,zen4",
  },
  {
    name: "cpu09",
    state: "IDLE",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 0.08,
    cpuTot: 64,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 255488,
    allocMemoryMB: 0,
    features: "epyc,zen4",
  },
  {
    name: "cpu10",
    state: "IDLE",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 0.03,
    cpuTot: 64,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 256000,
    allocMemoryMB: 0,
    features: "epyc,zen4",
  },
  {
    name: "cpu11",
    state: "MIXED",
    partitions: ["cpu"],
    cpuLoad: 7.6,
    cpuTot: 64,
    cpuAlloc: 8,
    realMemoryMB: 257024,
    freeMemoryMB: 224256,
    allocMemoryMB: 32768,
    allocTres: "cpu=8,mem=32G",
    features: "epyc,zen4",
  },
  {
    name: "cpu12",
    state: "IDLE",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 0.02,
    cpuTot: 64,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 256512,
    allocMemoryMB: 0,
    features: "epyc,zen4",
  },
  {
    name: "cpu13",
    state: "COMPLETING",
    partitions: ["cpu"],
    cpuLoad: 7.9,
    cpuTot: 64,
    cpuAlloc: 8,
    realMemoryMB: 257024,
    freeMemoryMB: 224256,
    allocMemoryMB: 32768,
    allocTres: "cpu=8,mem=32G",
    features: "epyc,zen4",
  },
  {
    name: "cpu14",
    state: "IDLE",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 0.05,
    cpuTot: 64,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 256512,
    allocMemoryMB: 0,
    features: "epyc,zen4",
  },
  {
    name: "cpu15",
    state: "IDLE",
    partitions: ["cpu", "cpu-long"],
    cpuLoad: 0.04,
    cpuTot: 64,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 256512,
    allocMemoryMB: 0,
    features: "epyc,zen4",
  },
  {
    name: "cpu16",
    state: "DRAINED",
    partitions: ["cpu"],
    cpuLoad: 0.01,
    cpuTot: 64,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 257024,
    allocMemoryMB: 0,
    features: "epyc,zen4",
    reason: "scheduled maintenance",
  },
  // GPU nodes (L40S)
  {
    name: "gpu01",
    state: "ALLOCATED",
    partitions: ["gpu"],
    cpuLoad: 14.2,
    cpuTot: 32,
    cpuAlloc: 16,
    realMemoryMB: 257024,
    freeMemoryMB: 158720,
    allocMemoryMB: 98304,
    gres: "gpu:l40s:2",
    gresUsed: "gpu:l40s:2",
    allocTres: "cpu=16,mem=96G,gres/gpu=2",
    features: "l40s,ada",
  },
  {
    name: "gpu02",
    state: "MIXED",
    partitions: ["gpu"],
    cpuLoad: 12.4,
    cpuTot: 32,
    cpuAlloc: 16,
    realMemoryMB: 257024,
    freeMemoryMB: 191488,
    allocMemoryMB: 65536,
    gres: "gpu:l40s:2",
    gresUsed: "gpu:l40s:1",
    allocTres: "cpu=16,mem=64G,gres/gpu=1",
    features: "l40s,ada",
  },
  {
    name: "gpu03",
    state: "MIXED",
    partitions: ["gpu"],
    cpuLoad: 6.8,
    cpuTot: 32,
    cpuAlloc: 8,
    realMemoryMB: 257024,
    freeMemoryMB: 207872,
    allocMemoryMB: 49152,
    gres: "gpu:l40s:2",
    gresUsed: "gpu:l40s:1",
    allocTres: "cpu=8,mem=48G,gres/gpu=1",
    features: "l40s,ada",
  },
  {
    name: "gpu04",
    state: "IDLE",
    partitions: ["gpu"],
    cpuLoad: 0.03,
    cpuTot: 32,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 256512,
    allocMemoryMB: 0,
    gres: "gpu:l40s:2",
    gresUsed: "gpu:l40s:0",
    features: "l40s,ada",
  },
  {
    name: "gpu05",
    state: "MIXED",
    partitions: ["gpu", "dev"],
    cpuLoad: 3.6,
    cpuTot: 32,
    cpuAlloc: 4,
    realMemoryMB: 257024,
    freeMemoryMB: 224256,
    allocMemoryMB: 32768,
    gres: "gpu:l40s:2",
    gresUsed: "gpu:l40s:1",
    allocTres: "cpu=4,mem=32G,gres/gpu=1",
    features: "l40s,ada",
  },
  {
    name: "gpu06",
    state: "IDLE",
    partitions: ["gpu", "dev"],
    cpuLoad: 0.02,
    cpuTot: 32,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 256512,
    allocMemoryMB: 0,
    gres: "gpu:l40s:2",
    gresUsed: "gpu:l40s:0",
    features: "l40s,ada",
  },
  {
    name: "gpu07",
    state: "IDLE",
    partitions: ["gpu"],
    cpuLoad: 0.01,
    cpuTot: 32,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 256512,
    allocMemoryMB: 0,
    gres: "gpu:l40s:2",
    gresUsed: "gpu:l40s:0",
    features: "l40s,ada",
  },
  {
    name: "gpu08",
    state: "IDLE",
    partitions: ["gpu"],
    cpuLoad: 0.01,
    cpuTot: 32,
    cpuAlloc: 0,
    realMemoryMB: 257024,
    freeMemoryMB: 256512,
    allocMemoryMB: 0,
    gres: "gpu:l40s:2",
    gresUsed: "gpu:l40s:0",
    features: "l40s,ada",
  },
];

// ---------- rendering ----------

function jobToMineRow(j: MockJob): string {
  // squeue -o "%i|%P|%j|%T|%M|%l|%D|%C|%R|%b"
  // The 10th field (%b = BatchFeatures) gets overridden by parseAllocTres downstream,
  // so we just put "(null)" — same as real Slurm output when no features are requested.
  return [
    j.jobId,
    j.partition,
    j.name,
    j.state,
    j.elapsed,
    j.timeLimit,
    j.nodes,
    j.cpus,
    j.reasonOrNodeList,
    "(null)",
  ].join("|");
}

function jobToAllRow(j: MockJob): string {
  // squeue -o "%i|%P|%j|%T|%M|%l|%D|%C|%R|%u|%b"
  return [
    j.jobId,
    j.partition,
    j.name,
    j.state,
    j.elapsed,
    j.timeLimit,
    j.nodes,
    j.cpus,
    j.reasonOrNodeList,
    j.user,
    "(null)",
  ].join("|");
}

function jobToAllocRow(j: MockJob): string {
  // squeue -O "JobID:64,tres-alloc:512" — left-padded fixed-width columns.
  return j.jobId.padEnd(64) + j.tres;
}

function nodeToLine(n: MockNode): string {
  const parts: string[] = [
    `NodeName=${n.name}`,
    `State=${n.state}`,
    `Partitions=${n.partitions.join(",")}`,
    `CPULoad=${n.cpuLoad === null ? "N/A" : n.cpuLoad.toFixed(2)}`,
    `CPUTot=${n.cpuTot}`,
    `CPUAlloc=${n.cpuAlloc}`,
    `RealMemory=${n.realMemoryMB}`,
    `FreeMem=${n.freeMemoryMB}`,
    `AllocMem=${n.allocMemoryMB}`,
  ];
  if (n.gres) parts.push(`Gres=${n.gres}`);
  if (n.gresUsed) parts.push(`GresUsed=${n.gresUsed}`);
  if (n.allocTres) parts.push(`AllocTRES=${n.allocTres}`);
  if (n.features) parts.push(`AvailableFeatures=${n.features}`);
  parts.push(`Reason="${n.reason ?? "None"}"`);
  return parts.join(" ");
}

function buildMyResponse(jobs: MockJob[], user: string): string {
  const mine = jobs.filter((j) => j.user === user);
  const primary = mine.map(jobToMineRow).join("\n");
  const alloc = mine.map(jobToAllocRow).join("\n");
  return `${primary}\n---ALLOC---\n${alloc}\n`;
}

function buildAllResponse(jobs: MockJob[]): string {
  const primary = jobs.map(jobToAllRow).join("\n");
  const alloc = jobs.map(jobToAllocRow).join("\n");
  return `${primary}\n---ALLOC---\n${alloc}\n`;
}

function buildNodesResponse(nodes: MockNode[]): string {
  return nodes.map(nodeToLine).join("\n") + "\n";
}

// ---------- per-host lookup ----------

function jobsForHost(host: string): MockJob[] {
  if (host === "phoenix") return PHOENIX_JOBS;
  if (host === "nimbus") return NIMBUS_JOBS;
  return [];
}

function nodesForHost(host: string): MockNode[] {
  if (host === "phoenix") return PHOENIX_NODES;
  if (host === "nimbus") return NIMBUS_NODES;
  return [];
}

// Local "YYYY-MM-DDTHH:MM:SS" — the format real scontrol emits and parseSlurmDateTime expects.
function slurmIso(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function durationSeconds(v: string): number {
  // Demo durations are well-formed ("0:45:23", "3-08:14:22"); fall back to 0.
  const dash = v.split("-");
  let days = 0;
  let rest = v;
  if (dash.length === 2) {
    days = Number(dash[0]);
    rest = dash[1];
  }
  const parts = rest.split(":").map(Number);
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0] ?? 0, parts[1] ?? 0];
  return days * 86_400 + h * 3600 + m * 60 + s;
}

function jobDetail(host: string, jobId: string): string {
  const j = jobsForHost(host).find((x) => x.jobId === jobId);
  if (!j) return `JobId=${jobId} JobState=NOT_FOUND Reason=Job_not_found`;
  // Derive timestamps from the job's elapsed / limit so the detail view's
  // elapsed / remaining / progress stay internally consistent (and tick live).
  const now = Date.now();
  const pending = j.state === "PENDING";
  const running = j.state === "RUNNING";
  const startMs = now - durationSeconds(j.elapsed) * 1000;
  // Running jobs report a projected EndTime (start + limit); finished/completing
  // jobs report the actual end (≈ now in the demo).
  const endMs = running ? startMs + durationSeconds(j.timeLimit) * 1000 : now;
  // Real Slurm leaves a pending job's StartTime "Unknown" until the scheduler
  // estimates it; give the demo a near-future estimate so the Schedule view has
  // something to show.
  const startTime = pending ? slurmIso(now + 40 * 60_000) : slurmIso(startMs);
  const endTime = pending ? "Unknown" : slurmIso(endMs);
  const submitMs = pending ? now - 5 * 60_000 : startMs - 3 * 60_000;
  return [
    `JobId=${j.jobId} JobName=${j.name}`,
    `   UserId=${j.user}(1000) GroupId=${j.user}(1000) MCS_label=N/A`,
    `   Priority=4294901758 Nice=0 Account=research QOS=normal`,
    `   JobState=${j.state} Reason=${pending ? j.reasonOrNodeList.replace(/[()]/g, "") : "None"} Dependency=(null)`,
    `   Requeue=1 Restarts=0 BatchFlag=1 Reboot=0 ExitCode=0:0`,
    `   RunTime=${j.elapsed} TimeLimit=${j.timeLimit} TimeMin=N/A`,
    `   SubmitTime=${slurmIso(submitMs)} EligibleTime=${slurmIso(submitMs)}`,
    `   StartTime=${startTime} EndTime=${endTime}`,
    `   Partition=${j.partition} AllocNode:Sid=login01:48291`,
    `   NodeList=${pending ? "(null)" : j.reasonOrNodeList}`,
    `   NumNodes=${j.nodes} NumCPUs=${j.cpus} NumTasks=${j.nodes} CPUs/Task=1`,
    // Real scontrol exposes ReqTRES (always) and AllocTRES (empty until the job
    // is allocated), not a plain "TRES" field.
    `   ReqTRES=${j.tres}`,
    `   AllocTRES=${pending ? "" : j.tres}`,
    `   Command=/home/${j.user}/scripts/${j.name}.sh`,
    `   WorkDir=/home/${j.user}/projects/${j.name}`,
    `   StdErr=/home/${j.user}/logs/${j.name}-${j.jobId}.err`,
    `   StdOut=/home/${j.user}/logs/${j.name}-${j.jobId}.out`,
  ].join("\n");
}

// ---------- live utilization (fixed values) ----------

// nvidia-smi-style model names + VRAM for the GPU types used in the fixtures.
const GPU_SPECS: Record<string, { name: string; totalMiB: number }> = {
  h100: { name: "NVIDIA H100 80GB HBM3", totalMiB: 81559 },
  a100: { name: "NVIDIA A100-SXM4-80GB", totalMiB: 81920 },
  l40s: { name: "NVIDIA L40S", totalMiB: 46068 },
};

// Fixed per-index utilization figures so the demo Utilization pane shows a
// believable mixed picture without streaming anything.
const GPU_UTIL = [94, 88, 97, 91, 86, 96, 90, 93];
const GPU_MEM_PCT = [78, 71, 84, 69, 75, 81, 66, 73];

// One synthetic metrics tick for an owned demo job, derived from its TRES (GPU
// count + model). The caller stamps `t`; values are constant per job/GPU index.
export function mockMetricSample(host: string, jobId: string): MetricSample | null {
  const j = jobsForHost(host).find((x) => x.jobId === jobId && x.user === DEMO_USER);
  if (!j || j.state !== "RUNNING") return null;
  const count = Number(/gres\/gpu=(\d+)/.exec(j.tres)?.[1] ?? 0);
  const model = /gres\/gpu:([^=,]+)=/.exec(j.tres)?.[1] ?? "";
  const spec = GPU_SPECS[model] ?? { name: model.toUpperCase() || "GPU", totalMiB: 81920 };
  const gpus = Array.from({ length: count }, (_, i) => ({
    index: i,
    name: spec.name,
    util: GPU_UTIL[i % GPU_UTIL.length],
    memPct: GPU_MEM_PCT[i % GPU_MEM_PCT.length],
    memTotalMiB: spec.totalMiB,
  }));
  // CPU-only jobs run hotter on CPU; GPU jobs are mostly dataloader-bound.
  return { t: Date.now(), gpus, cpu: count > 0 ? 62 : 87, ram: 54 };
}

// ---------- log tails ----------

function mockLogTail(host: string, filePath: string): string {
  const m = /-(\d+)\.(out|err)$/.exec(filePath);
  if (!m) return "";
  const j = jobsForHost(host).find((x) => x.jobId === m[1] && x.user === DEMO_USER);
  if (!j) return "";
  if (m[2] === "err") {
    return [
      `[${j.jobId}] WARNING: torch.distributed run with OMP_NUM_THREADS=1 — set it explicitly for best performance.`,
      "FutureWarning: `torch.cuda.amp.autocast(...)` is deprecated, use `torch.amp.autocast('cuda', ...)` instead.",
      "UserWarning: Detected call of `lr_scheduler.step()` before `optimizer.step()`.",
      "",
    ].join("\n");
  }
  return [
    `=== ${j.name} (job ${j.jobId}) on ${host} ===`,
    `Loading dataset shards from /scratch/${j.user}/${j.name}/data ... done (1024 shards)`,
    "Initializing model ... done",
    "Starting training from checkpoint step 42000",
    "step 42010 | loss 2.4137 | lr 3.0e-4 | 1.42 it/s",
    "step 42020 | loss 2.4051 | lr 3.0e-4 | 1.45 it/s",
    "step 42030 | loss 2.3988 | lr 3.0e-4 | 1.44 it/s",
    "step 42040 | loss 2.3902 | lr 3.0e-4 | 1.45 it/s",
    "[eval] step 42040 | val_loss 2.4310 | val_ppl 11.37",
    "saved checkpoint to checkpoints/step_42040.pt",
    "step 42050 | loss 2.3877 | lr 3.0e-4 | 1.43 it/s",
    "step 42060 | loss 2.3815 | lr 3.0e-4 | 1.44 it/s",
    "",
  ].join("\n");
}

// ---------- dispatcher ----------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockRunSsh(host: string, cmd: string): Promise<string> {
  // Slight delay so React shows loading states realistically in screenshots.
  await sleep(220);

  if (cmd === "whoami") return `${DEMO_USER}\n`;

  // "My" jobs: squeue -h -u <user> -o ...; echo '---ALLOC---'; squeue -h -u <user> -O ...
  if (cmd.startsWith("squeue -h -u ")) {
    return buildMyResponse(jobsForHost(host), DEMO_USER);
  }

  // "All" jobs: squeue -h -o ...; echo '---ALLOC---'; squeue -h -O ...
  if (cmd.startsWith("squeue -h -o ")) {
    return buildAllResponse(jobsForHost(host));
  }

  if (cmd === "scontrol show node --oneliner") {
    return buildNodesResponse(nodesForHost(host));
  }

  if (cmd.startsWith("scontrol show job ")) {
    const jobId = cmd
      .replace("scontrol show job ", "")
      .trim()
      .replace(/^'(.*)'$/, "$1");
    return jobDetail(host, jobId) + "\n";
  }

  // Log tails for the Output / Error panes: readLogTail's
  // `tail -c <n> -- <path> | tr ... | tail -n <n>` pipeline.
  if (cmd.startsWith("tail -c ")) {
    const m = /--\s+'?([^\s'|]+)'?/.exec(cmd);
    return mockLogTail(host, m ? m[1] : "");
  }

  if (cmd.startsWith("scancel ")) return "";

  return "";
}
