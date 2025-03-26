// Define conversion patterns for each package manager
export type PackageManager = "pnpm" | "bun" | "yarn";

export interface ConversionPattern {
  from: RegExp;
  to: string | ((match: string, ...args: string[]) => string);
}

// Base npm commands that will be converted
export interface NpmCommandMapping {
  command: string;
  regex: RegExp;
}

// Define the base npm commands
export const npmCommands: NpmCommandMapping[] = [
  // Handle the difference between "npm install" and "npm install <pkg>"
  { command: "installAll", regex: /\bnpm install\b(?!\s+[\w@/-])/g }, // npm install with no args
  { command: "installPkg", regex: /\bnpm install\s+([\w@-][^\s]*)/g }, // npm install <pkg>
  { command: "installPkg", regex: /\bnpm i\s+([\w@-][^\s]*)/g }, // npm i <pkg>
  { command: "run", regex: /\bnpm run\b/g },
  { command: "exec", regex: /\bnpm exec\b/g },
  { command: "uninstall", regex: /\bnpm uninstall\b/g },
  { command: "npx", regex: /\bnpx\b/g },
];

// Define equivalent commands for each package manager
export const packageManagerCommands: Record<PackageManager, Record<string, string>> = {
  pnpm: {
    installAll: "pnpm install",
    installPkg: "pnpm add $1",
    run: "pnpm run",
    exec: "pnpm exec",
    uninstall: "pnpm remove",
    npx: "pnpm dlx",
  },
  bun: {
    installAll: "bun install",
    installPkg: "bun add $1",
    run: "bun run",
    exec: "bun x",
    uninstall: "bun remove",
    npx: "bunx",
  },
  yarn: {
    installAll: "yarn install",
    installPkg: "yarn add $1",
    run: "yarn",
    exec: "yarn exec",
    uninstall: "yarn remove",
    npx: "yarn dlx",
  },
};

// Generate conversion patterns based on the package manager
export function generateConversionPatterns(packageManager: PackageManager): ConversionPattern[] {
  return npmCommands.map(({ command, regex }) => {
    const replacement = packageManagerCommands[packageManager][command];
    // For commands that need to preserve arguments (like installPkg)
    const needsArgumentPreservation = replacement.includes("$1");

    return {
      from: regex,
      to: needsArgumentPreservation
        ? (match: string, ...args: string[]) => {
            // Replace $1, $2, etc. with captured groups
            return replacement.replace(/\$(\d+)/g, (_, index) => args[parseInt(index) - 1] || "");
          }
        : replacement,
    };
  });
}

// For backwards compatibility and easy access
export const conversionPatterns: Record<PackageManager, ConversionPattern[]> = {
  pnpm: generateConversionPatterns("pnpm"),
  bun: generateConversionPatterns("bun"),
  yarn: generateConversionPatterns("yarn"),
};
