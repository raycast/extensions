import { GeneratorList } from "./components/GeneratorList";
import { TAX_ID_TYPES } from "./lib/taxid";
import { flag } from "./lib/types";

const SECTIONS: Record<string, string> = { US: "United States", AU: "Australia", NZ: "New Zealand" };

const items = TAX_ID_TYPES.map((type) => ({
  id: type.id,
  title: type.title,
  icon: flag(type.iso),
  keywords: type.keywords,
  section: SECTIONS[type.iso],
  generate: () => {
    const value = type.generate();
    return { ...value, fields: [...(value.fields ?? []), { label: "Validation", value: type.algorithm }] };
  },
  accessory: () => [{ text: type.subtitle }],
}));

export default function Command() {
  return (
    <GeneratorList items={items} namespace="tax-id" searchBarPlaceholder="Search EIN, ABN, ACN, TFN, IRD, NZBN…" />
  );
}
