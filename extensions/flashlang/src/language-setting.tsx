import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, LocalStorage, showToast, Toast, popToRoot } from "@raycast/api";
import useLanguageList from "./utils/useLanguageList";

export default function SetNativeLanguage() {
  const [language, setLanguage] = useState("");
  const [learningLanguage, setLearningLanguage] = useState("");
  const languageOptions = useLanguageList();

  const handleSubmit = async () => {
    await LocalStorage.setItem("native-language", language);
    await showToast({
      style: Toast.Style.Success,
      title: "Language Saved",
      message: `Native language has been set to ${language}.`,
    });
    await LocalStorage.setItem("learning-language", learningLanguage);
    await showToast({
      style: Toast.Style.Success,
      title: "Language Saved",
      message: `Learning language has been set to ${learningLanguage}.`,
    });
    popToRoot();
  };

  useEffect(() => {
    const fetchNativeLanguage = async () => {
      try {
        const nativeLanguage: string = (await LocalStorage.getItem("native-language")) || "";
        const learningLanguage: string = (await LocalStorage.getItem("learning-language")) || "";
        setLanguage(nativeLanguage || "en");
        setLearningLanguage(learningLanguage || "en");
      } catch (error) {
        console.error("Failed to fetch native language:", error);
      }
    };
    fetchNativeLanguage();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Language" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="native-language"
        title="Native Language"
        placeholder="Select your native language"
        value={language}
        storeValue
        onChange={setLanguage}
      >
        {languageOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="learning-language"
        title="Learning Language"
        placeholder="Select your learning language"
        value={learningLanguage}
        storeValue
        onChange={setLearningLanguage}
      >
        {languageOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
