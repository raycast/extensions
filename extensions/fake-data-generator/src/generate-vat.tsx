import { GeneratorList } from "./components/GeneratorList";
import { flag } from "./lib/types";
import { generateVat, VAT_COUNTRIES } from "./lib/vat";

const byName = [...VAT_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

const items = byName.map((country) => ({
  id: country.prefix,
  title: country.name,
  icon: flag(country.iso),
  keywords: [country.prefix, country.iso, ...country.keywords],
  section: ["GB", "XI", "CHE", "NO"].includes(country.prefix) ? "Outside the EU" : "European Union (VIES)",
  generate: () => generateVat(country),
  accessory: () => [{ text: country.localName }],
}));

export default function Command() {
  return (
    <GeneratorList
      items={items}
      namespace="vat"
      searchBarPlaceholder="Search country or tax name (e.g. BTW, USt, TVA)…"
    />
  );
}
