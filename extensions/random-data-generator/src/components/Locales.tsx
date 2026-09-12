import { List } from "@raycast/api";

import fakerClient from "@/faker";

export interface LocalesProps {
  value: string;
  onChange: (locale: string) => void;
}

export default function Locales({ value, onChange }: LocalesProps) {
  return (
    <List.Dropdown tooltip="Change Language" value={value} onChange={onChange}>
      {Object.entries(fakerClient.locales).map(([localeKey, locale]) => {
        if (!locale) return null;

        return <List.Dropdown.Item key={localeKey} title={locale.metadata?.title || localeKey} value={localeKey} />;
      })}
    </List.Dropdown>
  );
}
