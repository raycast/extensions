import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { LanguagesManagerList } from "./components/LanguagesManagerList";
import { DEFAULT_TRANSLATION_AGENT } from "./lib/constants";
import { useLanguage, useCurrentLanguage, useAI } from "./lib/hooks";
import { formatLanguageSet } from "./lib/language";
import ResultView from "./components/ResultView";
import { useState } from "react";

export default function Translate() {
  const { push } = useNavigation();
  const agent = DEFAULT_TRANSLATION_AGENT;
  const [isResult, setResult] = useState(false);
  const [prompt, setPrompt] = useState("");
  const { langsetList, isLoading } = useLanguage();
  const { langset, setCurrentLangset } = useCurrentLanguage();

  const { response, getAIResponse, isLoading: isAILoading } = useAI(agent.name);

  const handleSubmit = () => {
    setResult(true);
    getAIResponse(prompt);
  };

  const handleLangsetChange = (value: string) => {
    if (value === "manage") {
      push(<LanguagesManagerList />);
    } else {
      setCurrentLangset(value);
    }
  };

  return isResult ? (
    <ResultView agent={agent} user_input={prompt} response={response} isLoading={isAILoading} />
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" placeholder="Ask anything" id="prompt" value={prompt} onChange={setPrompt} />
      <Form.Dropdown id="langset" title="Language Set" value={langset?.id} onChange={handleLangsetChange}>
        <Form.Dropdown.Item icon={Icon.Pencil} title="Manage language sets..." value="manage" />
        {langsetList?.map((langset) => (
          <Form.Dropdown.Item key={langset.id} title={formatLanguageSet(langset)} value={langset.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
