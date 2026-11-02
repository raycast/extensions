import { Color, List } from "@raycast/api";
import { useState } from "react";
import { GeneratorList } from "./components/GeneratorList";
import { generatePhone, PHONE_COUNTRIES, PhoneKind, PhoneResult } from "./lib/phone";
import { flag } from "./lib/types";
import { preferences } from "./preferences";

export default function Command() {
  const [kind, setKind] = useState<PhoneKind>("mobile");
  const mode = preferences().phoneMode;

  const items = PHONE_COUNTRIES.map((country) => ({
    id: country.code,
    title: country.name,
    icon: flag(country.code),
    keywords: [country.code, ...country.keywords],
    generate: () => generatePhone(country.code, kind, mode),
    accessory: (value: object) => {
      const phone = value as PhoneResult;
      const accessories: List.Item.Accessory[] = [];
      if (!phone.valid) accessories.push({ tag: { value: "fails validation", color: Color.Red } });
      accessories.push(
        phone.fictional
          ? { tag: { value: "fictional", color: Color.Green }, tooltip: "Regulator-reserved range for films/TV" }
          : { tag: { value: "random", color: Color.Orange }, tooltip: "Valid range, could belong to someone" },
      );
      return accessories;
    },
  }));

  return (
    <GeneratorList
      items={items}
      namespace="phone"
      generationKey={kind}
      searchBarPlaceholder="Search country…"
      searchBarAccessory={
        <List.Dropdown tooltip="Number type" storeValue onChange={(v) => setKind(v as PhoneKind)}>
          <List.Dropdown.Item title="Mobile" value="mobile" />
          <List.Dropdown.Item title="Landline" value="landline" />
        </List.Dropdown>
      }
    />
  );
}
