import { GeneratorList } from "./components/GeneratorList";
import { generateIban, Iban, IBAN_COUNTRIES } from "./lib/iban";
import { flag, Generated } from "./lib/types";

const byName = [...IBAN_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

const items = byName.map((country) => ({
  id: country.code,
  title: country.name,
  icon: flag(country.code),
  keywords: [country.code, ...country.keywords],
  generate: () => generateIban(country),
  accessory: (value: Generated) => {
    const bank = (value as Iban).bankName;
    return [...(bank ? [{ text: bank }] : []), { tag: country.code }];
  },
}));

export default function Command() {
  return (
    <GeneratorList
      items={items}
      namespace="iban"
      searchBarPlaceholder="Search country (e.g. Belgium, NL, Deutschland)…"
    />
  );
}
