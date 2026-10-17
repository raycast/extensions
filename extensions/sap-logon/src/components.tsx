import { Form } from "@raycast/api";

export const LANGUAGES = [
  { value: "EN", title: "English (EN)" },
  { value: "DE", title: "German (DE)" },
  { value: "FR", title: "French (FR)" },
  { value: "ES", title: "Spanish (ES)" },
  { value: "IT", title: "Italian (IT)" },
  { value: "PT", title: "Portuguese (PT)" },
  { value: "NL", title: "Dutch (NL)" },
  { value: "PL", title: "Polish (PL)" },
  { value: "RU", title: "Russian (RU)" },
  { value: "ZH", title: "Chinese (ZH)" },
  { value: "JA", title: "Japanese (JA)" },
  { value: "KO", title: "Korean (KO)" },
  { value: "TR", title: "Turkish (TR)" },
] as const;

interface LanguageDropdownProps {
  id: string;
  title: string;
  value?: string;
  error?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: Form.Event<string>) => void;
  // When true, offers an empty "Ask on connect" option (no stored language).
  allowAsk?: boolean;
}

export function LanguageDropdown({ id, title, value, error, onChange, onBlur, allowAsk }: LanguageDropdownProps) {
  return (
    <Form.Dropdown
      id={id}
      title={title}
      value={value}
      error={error}
      onChange={onChange}
      onBlur={onBlur}
      info={allowAsk ? "Choose 'Ask on connect' to be prompted for the language each time you connect." : undefined}
    >
      {allowAsk && <Form.Dropdown.Item value="" title="Ask on connect (no default)" />}
      {LANGUAGES.map((lang) => (
        <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
      ))}
    </Form.Dropdown>
  );
}
