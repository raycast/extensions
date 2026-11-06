import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = join(root, "src/adapters/index.ts");
const packagePath = join(root, "package.json");

const indexContent = readFileSync(indexPath, "utf8");

const imports = new Map();
for (const match of indexContent.matchAll(/import\s+\{\s*(\w+)\s*\}\s+from\s+"\.\/([^"]+)"/g)) {
  imports.set(match[1], match[2]);
}

const arrayMatch = indexContent.match(/export const adapters[^=]*=\s*\[([\s\S]*?)\];/);
if (!arrayMatch) {
  throw new Error("Could not parse adapters array in src/adapters/index.ts");
}

const adapterNames = arrayMatch[1]
  .split(",")
  .map((entry) => entry.replace(/\/\/.*$/gm, "").trim())
  .filter(Boolean);

const managers = adapterNames.map((adapterName) => {
  const moduleName = imports.get(adapterName);
  if (!moduleName) {
    throw new Error(`Missing import for adapter export "${adapterName}"`);
  }

  const adapterContent = readFileSync(join(root, "src/adapters", `${moduleName}.ts`), "utf8");
  const adapterMatch = adapterContent.match(
    /export const \w+:\s*PasswordManagerAdapter\s*=\s*\{\s*\n\s*id:\s*"([^"]+)",\s*\n\s*name:\s*"([^"]+)"/,
  );

  if (!adapterMatch) {
    throw new Error(`Could not parse adapter metadata from src/adapters/${moduleName}.ts`);
  }

  return { title: adapterMatch[2], value: adapterMatch[1] };
});

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
let preference = packageJson.preferences?.find((entry) => entry.name === "defaultManagerId");

if (!preference) {
  preference = { name: "defaultManagerId" };
  packageJson.preferences = packageJson.preferences ?? [];
  packageJson.preferences.unshift(preference);
}

preference.type = "dropdown";
preference.required = false;
preference.title = "Default Manager";
preference.description =
  'Password manager to use by default. Choose "Auto" to use the first available adapter.';
preference.default = "auto";
preference.data = [{ title: "Auto (first available)", value: "auto" }, ...managers];
delete preference.placeholder;

for (const command of packageJson.commands ?? []) {
  if (Array.isArray(command.preferences)) {
    command.preferences = command.preferences.filter((entry) => entry.name !== "defaultManagerId");
    if (command.preferences.length === 0) {
      delete command.preferences;
    }
  }
}

writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log(`Synced defaultManagerId dropdown with ${managers.length} manager(s).`);
