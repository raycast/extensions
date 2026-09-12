/**
 * Configuration constants for Nuxt Dev Server Monitor
 * All settings in one place for easy customization
 */

/**
 * Port range to scan for Nuxt dev servers
 */
export const PORT_RANGE = {
  MIN: 3000,
  MAX: 3010,
} as const;

/**
 * Shell commands used to detect and manage Nuxt processes
 */
export const SHELL_COMMANDS = {
  /**
   * Find Node processes listening on ports in range
   * Returns: PID PORT (e.g., "12345 *:3000")
   * Format: Column 2 = PID, Column 9 = NAME (address:port)
   */
  FIND_LISTENING_PORTS: (minPort: number, maxPort: number) =>
    `lsof -i :${minPort}-${maxPort} -sTCP:LISTEN -n -P 2>/dev/null | awk 'NR>1 && /node/ {print $2, $9}' || echo ""`,

  /**
   * Find Nuxt/Nitro processes
   * Returns: Full ps aux output for matching processes
   */
  FIND_NUXT_PROCESSES: 'ps aux | grep -i "node.*nuxt\\|nuxi\\|nitro" | grep -v grep | grep -v "menu-bar" || echo ""',

  /**
   * Get process working directory using lsof
   * Returns: Path to working directory
   */
  GET_PROCESS_CWD: (pid: string) => `lsof -a -p ${pid} -d cwd -Fn 2>/dev/null`,

  /**
   * Get process memory and CPU usage
   * Returns: RSS CPU (e.g., "123456 2.5")
   */
  GET_PROCESS_STATS: (pid: string) => `ps -p ${pid} -o rss=,pcpu= 2>/dev/null`,

  /**
   * Kill a process by PID
   */
  KILL_PROCESS: (pid: string) => `kill -9 ${pid}`,
} as const;

/**
 * Regex patterns to extract project path from command line
 */
export const NUXT_PATH_PATTERNS = [
  /node\s+([^\s]+)\/node_modules\/.*?nuxt.*?\s+dev/, // node /path/node_modules/.../nuxt.mjs dev
  /node\s+([^\s]+\/)\.nuxt\/dev/, // node /path/.nuxt/dev
  /npx\s+nuxi.*?\s+-C\s+([^\s]+)/, // npx nuxi -C /path
  /npm\s+run\s+dev.*?--prefix\s+([^\s]+)/, // npm run dev --prefix /path
  /pnpm\s+.*?--filter\s+([^\s]+)/, // pnpm --filter /path
  /yarn\s+workspace\s+([^\s]+)/, // yarn workspace /path
] as const;

/**
 * Keywords to identify Nuxt processes in ps output
 */
export const NUXT_PROCESS_KEYWORDS = ["nuxt", "nuxi", "nitro"] as const;
