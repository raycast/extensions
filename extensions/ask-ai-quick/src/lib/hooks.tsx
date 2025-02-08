import { showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { randomUUID } from "crypto";
import { useMemo, useState } from "react";
import { openai } from "../api";
import {
  AGENT_LIST_KEY,
  CURRENT_LANGUAGE_SET_KEY,
  DEFAULT_AGENT,
  DEFAULT_MODEL,
  DEFAULT_TRANSLATION_AGENT,
  LANGUAGE_SET_LIST_KEY,
} from "./constants";

export interface AgentFormValues {
  name: string;
  prompt: string;
  model: string;
  isBuiltIn?: boolean;
}

export const useAgents = () => {
  const [value, setAgents] = useCachedState<AgentFormValues[]>(AGENT_LIST_KEY, []);
  const agents = [DEFAULT_AGENT, DEFAULT_TRANSLATION_AGENT, ...(value ?? [])];
  const addAgent = async (values: AgentFormValues) => {
    const agentList = value ?? [];
    if (agents?.find((item) => item.name === values.name)) {
      return;
    }
    agentList.push(values);
    return setAgents(agentList);
  };
  const delAgent = async (name: string) => {
    return setAgents(value?.filter((agent) => agent.name !== name) ?? []);
  };
  return { agents, addAgent, delAgent, isLoading: false };
};

export interface LanguageSet {
  id: string;
  source: string;
  target: string;
}

export const useLanguage = () => {
  const [langsetList, setValue] = useCachedState<LanguageSet[]>(LANGUAGE_SET_LIST_KEY, []);
  const addLang = (source: string, target: string) => {
    const lang = { id: randomUUID(), source, target };
    return setValue([...(langsetList ?? []), lang]);
  };
  const delLang = (id: string) => {
    return setValue(langsetList?.filter((lang) => lang.id !== id) ?? []);
  };

  const removeAll = () => {
    setValue([]);
  };

  return { langsetList: langsetList, addLang, delLang, removeAll, isLoading: false };
};

export const useCurrentLanguage = () => {
  const { langsetList } = useLanguage();
  const [value, setValue] = useCachedState(CURRENT_LANGUAGE_SET_KEY, langsetList?.[0]?.id);
  const currentLangset = useMemo(
    () => langsetList?.find((lang) => lang.id === value ?? langsetList[0]),
    [langsetList, value]
  );
  const setCurrentLangset = (id: string) => {
    setValue(id);
  };
  return {
    langset: currentLangset,
    setCurrentLangset,
  };
};

export const useAI = (agentKey: string) => {
  const { agents } = useAgents();
  const { langset } = useCurrentLanguage();
  const [response, setResponse] = useState("");

  const agent = agents?.find((agent) => agent.name === agentKey) ?? DEFAULT_AGENT;
  const model = agent.model !== null && agent.model !== "Default" ? agent.model : DEFAULT_MODEL;

  const [isLoading, setLoading] = useState(false);

  const getAIResponse = async (user_input: string) => {
    const now = new Date();

    const newSystemPrompt = agent.prompt
      .replaceAll("{{source}}", langset?.source ?? "zh-CN")
      .replaceAll("{{target}}", langset?.target ?? "en");

    setLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Answering...");
    const stream = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: newSystemPrompt },
        { role: "user", content: user_input },
      ],
      stream: true,
    });

    for await (const part of stream) {
      const message = part.choices[0].delta.content;
      if (message) {
        setResponse((value) => value + message);
      }
      if (part.choices[0].finish_reason === "stop") {
        const done = new Date();
        const duration = (done.getTime() - now.getTime()) / 1000;
        toast.style = Toast.Style.Success;
        toast.title = `Finished in ${duration} seconds`;
        break; // Stream finished
      }
    }
    setLoading(false);

    return stream;
  };
  return { response, getAIResponse, isLoading, agent };
};
