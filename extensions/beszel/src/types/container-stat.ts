export interface ContainerStat {
  type: string;
  updated: string;
  created: string;
  stats: ContainerStatStats[];
}

/**
 * @see https://github.com/henrygd/beszel/blob/main/beszel/internal/entities/container/container.go
 */
export interface ContainerStatStats {
  /**
   * The container name
   * @example "meilisearch-gg088w0s0w8k0488kso48okk",
   */
  n: string;
  /**
   * CPU load in percentage
   * @example 0.04
   */
  c: number;
  /**
   * Memory usage in MB
   * @example 112.25
   */
  m: number;
  /**
   * Network sent in MB/s
   * @example 0
   */
  ns: number;
  /**
   * Network received in MB/s
   * @example 0
   */
  nr: number;
}
