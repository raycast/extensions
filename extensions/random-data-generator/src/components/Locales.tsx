import { List, LocalStorage } from "@raycast/api";

import type { Faker } from "@/faker";

export interface LocalesProps {
  faker: Faker;
  onChange: () => void;
}

export default function Locales({ faker, onChange }: LocalesProps) {
  return (
    <List.Dropdown
      tooltip="Change Language"
      value={faker.locale}
      onChange={(newLocale) => {
        faker.locale = newLocale;
        LocalStorage.setItem("locale", newLocale);
        onChange();
      }}
    >
      {Object.entries(faker.locales).map(([localeKey, locale]) => {
        if (!locale) return null;

        return <List.Dropdown.Item key={localeKey} title={locale.title} value={localeKey} />;
      })}
    </List.Dropdown>
  );
}
