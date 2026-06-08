// Generates the `country` argument dropdown in package.json from vat.json so
// that vat.json stays the single source of truth for available countries.
// Runs automatically before `dev` and `build` (predev / prebuild npm hooks).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const vat = JSON.parse(readFileSync(join(root, "vat.json"), "utf8"));
const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const data = vat.countries.map((country) => ({
  title: country.name,
  value: country.code,
}));

const command = pkg.commands?.find((cmd) => cmd.name === "calculate-vat");
const countryArg = command?.arguments?.find((arg) => arg.name === "country");

if (!countryArg) {
  throw new Error("Could not find the `country` argument in package.json");
}

countryArg.data = data;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`Synced ${data.length} country/countries from vat.json into package.json`);
