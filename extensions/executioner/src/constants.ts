export const STORAGE_KEYS = {
  RECENTLY_KILLED: "recently-killed",
  GROUP_MODE: "group-mode",
  SORT_FIELD: "sort-field",
} as const;

export const PS_COMMAND = "ps -eo pid,ppid,pcpu,pmem,rss,etime,ni,comm";

export const MAX_RECENTLY_KILLED = 50;

export const IDLE_CPU_THRESHOLD = 0.1;
export const IDLE_MEM_KB = 10 * 1024; // 10MB
