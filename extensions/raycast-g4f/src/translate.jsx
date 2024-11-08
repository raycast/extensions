import useGPT from "./api/gpt.jsx";

import { Form } from "@raycast/api";
import { useEffect, useState } from "react";

import { Storage } from "./api/storage.js";
import { Preferences } from "./api/preferences.js";

import { preferences } from "../package.json";

const languages = preferences.find((x) => x.name === "defaultLanguage").data.map((x) => [x.title, x.value]);

const languagesReact = languages.map(([title, value]) => (
  <Form.Dropdown.Item title={title} value={value} key={value} />
));

export default function Translate(props) {
  let [language, setLanguage] = useState("");

  useEffect(() => {
    (async () => {
      setLanguage(await Storage.read("translateLanguage", "English"));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!language) return;
      await Storage.write("translateLanguage", language);
    })();
  }, [language]);

  const useDefaultLanguage = Preferences["translateUseDefaultLanguage"];

  return useGPT(props, {
    useSelected: true,
    showFormText: "Text to translate",
    allowPaste: true,
    forceShowForm: !useDefaultLanguage,
    allowUploadFiles: true,
    otherReactComponents: [
      <Form.Dropdown id="language" value={language} onChange={setLanguage} key="languageDropdown">
        {languagesReact}
      </Form.Dropdown>,
    ],
    processPrompt: ({ query, values }) => {
      const language = useDefaultLanguage ? Preferences["defaultLanguage"] : values.language;
      return (
        `Translate the following text to ${language}. ONLY return the translated text and nothing else.` +
        `\n\n${query}`
      );
    },
  });
}
