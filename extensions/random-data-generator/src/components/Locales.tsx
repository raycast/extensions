import { List, LocalStorage } from "@raycast/api";

import fakerClient from "@/faker";

export interface LocalesProps {
  onChange: () => void;
}

export default function Locales({ onChange }: LocalesProps) {
  return (
    <List.Dropdown
      tooltip="Change Language"
      value={fakerClient.locale}
      onChange={(newLocale) => {
        fakerClient.setLocale(newLocale);
        LocalStorage.setItem("locale", newLocale);
        onChange();
      }}
    >
      {Object.entries(fakerClient.locales).map(([localeKey, locale]) => {
        if (!locale) return null;

        return <List.Dropdown.Item key={localeKey} title={locale.metadata?.title || localeKey} value={localeKey} />;
      })}
    </List.Dropdown>
  );
}
