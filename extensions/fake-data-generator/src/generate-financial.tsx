import { Icon } from "@raycast/api";
import { GeneratorList, GeneratorItem } from "./components/GeneratorList";
import { financialSections } from "./lib/financial";
import { flag } from "./lib/types";

const items: GeneratorItem[] = financialSections().flatMap((section) =>
  section.items.map((item) => ({
    id: item.id,
    title: item.title,
    icon: item.iso ? flag(item.iso) : item.id.startsWith("bic") ? Icon.Building : Icon.CreditCard,
    keywords: item.keywords,
    section: section.title,
    generate: item.generate,
    accessory: (value) => {
      const bank = value.variants?.find((v) => v.label === "Bank name")?.value;
      return bank ? [{ text: bank }] : [];
    },
  })),
);

export default function Command() {
  return (
    <GeneratorList
      items={items}
      namespace="financial"
      searchBarPlaceholder="Search BIC, card, routing number, sort code…"
    />
  );
}
