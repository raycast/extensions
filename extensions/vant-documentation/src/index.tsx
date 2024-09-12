import { List } from "@raycast/api";
import { useState } from "react";
import enUS from "./documentation/en-US.json";
import zhCN from "./documentation/zh-CN.json";
import { LanguageDropdown } from "./language-dropdown";
import { DocumentationList } from "./documentation-list";

import type { Language, Documentation, Doc } from "./type";

const LANGUAGES: Language[] = [
  {
    label: "English (US)",
    value: "enUS",
  },
  {
    label: "China",
    value: "zhCN",
  },
];

const DOCUMENTATION: Documentation = {
  enUS,
  zhCN,
};

export default function Command() {
  const [doc, setDoc] = useState<Doc[]>(DOCUMENTATION["enUS"]);

  const languageChange = (lang: string) => {
    setDoc(DOCUMENTATION[lang]);
  };

  return (
    <List searchBarAccessory={<LanguageDropdown languages={LANGUAGES} onLanguageChange={languageChange} />}>
      <DocumentationList doc={doc} />
    </List>
  );
}
