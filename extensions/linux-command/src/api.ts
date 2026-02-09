import { Cache } from "@raycast/api";

const CACHE_KEY_LIST = "linux-commands-list";
const CACHE_KEY_DETAIL = "linux-command-detail";
const CACHE_DURATION_LIST = 7 * 24 * 60 * 60 * 1000; // 7 days for command list
const CACHE_DURATION_DETAIL = 30 * 24 * 60 * 60 * 1000; // 30 days for command details

const INDEX_URL = "https://unpkg.com/linux-command/dist/data.json";
const DETAIL_URL_BASE = "https://unpkg.com/linux-command/command";

const cache = new Cache();

export interface LinuxCommandRaw {
  n: string; // name
  d: string; // description
  p: string; // path
}

export interface LinuxCommandExtended {
  name: string;
  description: string;
  path: string;
  detailUrl: string;
}

export interface CommandDetail {
  name: string;
  description: string;
  content: string;
  syntax?: string;
  examples: string[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Fetch command list from unpkg CDN
 */
export async function fetchCommands(): Promise<LinuxCommandExtended[]> {
  // Check cache first
  const cached = cache.get(CACHE_KEY_LIST);
  if (cached) {
    try {
      const { data, timestamp }: CacheEntry<Record<string, LinuxCommandRaw>> = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION_LIST) {
        return Object.values(data).map(transformCommand);
      }
    } catch {
      // Invalid cache, continue to fetch
    }
  }

  // Fetch from network
  const response = await fetch(INDEX_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch command list: ${response.status}`);
  }

  const commands: Record<string, LinuxCommandRaw> = await response.json();

  // Cache the result
  cache.set(
    CACHE_KEY_LIST,
    JSON.stringify({
      data: commands,
      timestamp: Date.now(),
    }),
  );

  return Object.values(commands).map(transformCommand);
}

/**
 * Transform raw command data to extended format
 */
function transformCommand(cmd: LinuxCommandRaw): LinuxCommandExtended {
  return {
    name: cmd.n,
    description: cmd.d,
    path: cmd.p,
    detailUrl: `${DETAIL_URL_BASE}/${cmd.n}.md`,
  };
}

/**
 * Fetch command detail markdown from unpkg CDN
 */
export async function fetchCommandDetail(commandName: string): Promise<CommandDetail> {
  const cacheKey = `${CACHE_KEY_DETAIL}-${commandName}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      const { data, timestamp }: CacheEntry<CommandDetail> = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION_DETAIL) {
        return data;
      }
    } catch {
      // Invalid cache, continue to fetch
    }
  }

  // Fetch from network
  const detailUrl = `${DETAIL_URL_BASE}/${commandName}.md`;
  const response = await fetch(detailUrl);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Command '${commandName}' not found`);
    }
    throw new Error(`Failed to fetch command detail: ${response.status}`);
  }

  const markdown = await response.text();
  const detail = parseCommandMarkdown(commandName, markdown);

  // Cache the result
  cache.set(
    cacheKey,
    JSON.stringify({
      data: detail,
      timestamp: Date.now(),
    }),
  );

  return detail;
}

/**
 * Parse markdown content to extract structured information
 */
function parseCommandMarkdown(name: string, markdown: string): CommandDetail {
  const lines = markdown.split("\n");

  // Extract description from the first paragraph after the title
  let description = "";
  let foundTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("===") || trimmed.startsWith("---")) {
      foundTitle = true;
      continue;
    }

    if (foundTitle && trimmed && !trimmed.startsWith("#")) {
      description = trimmed;
      break;
    }
  }

  // Extract examples from code blocks
  const examples: string[] = [];
  let inShellBlock = false;
  let currentBlock = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of shell code block
    if (line.startsWith("```shell") || line.startsWith("```bash") || line.startsWith("```sh")) {
      inShellBlock = true;
      currentBlock = "";
      continue;
    }

    // End of code block
    if (line.startsWith("```") && inShellBlock) {
      inShellBlock = false;
      const trimmed = currentBlock.trim();
      if (trimmed) {
        examples.push(trimmed);
      }
      currentBlock = "";
      continue;
    }

    if (inShellBlock) {
      currentBlock += line + "\n";
    }
  }

  // Clean up markdown for display
  let cleanContent = markdown.replace(/<!--rehype:.*?-->/g, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // Limit content length for performance
  if (cleanContent.length > 50000) {
    cleanContent = cleanContent.substring(0, 50000) + "\n\n... (content truncated)";
  }

  return {
    name,
    description,
    content: cleanContent,
    examples: examples.slice(0, 10), // Limit to 10 examples
  };
}

/**
 * Search commands by keyword
 */
export function searchCommands(commands: LinuxCommandExtended[], keyword: string): LinuxCommandExtended[] {
  const lowerKeyword = keyword.toLowerCase();

  return commands.filter(
    (cmd) => cmd.name.toLowerCase().includes(lowerKeyword) || cmd.description.toLowerCase().includes(lowerKeyword),
  );
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
  cache.remove(CACHE_KEY_LIST);

  // Remove all detail caches
  const allKeys = Object.keys(cache);
  for (const key of allKeys) {
    if (key.startsWith(CACHE_KEY_DETAIL)) {
      cache.remove(key);
    }
  }
}
