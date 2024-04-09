import { randomUUID } from "crypto";
import { useState } from "react";
import { Action } from "../types";
import { createStore } from "../utils";

interface ActionState {
  actions: Action[];
  addAction: (action: Omit<Action, "id">) => void;
  editAction: (action: Action) => void;
  removeAction: (id: string) => void;
}

const initialState: Action[] = [
  {
    id: "b0259928-4a63-4e27-9d3b-df76c6a8e290",
    name: "Summarize",
    description: "Provide a concise summary of the provided text, highlighting the main points and key information.",
    systemPrompt: "Summarize the key points and main information from the following text:",
    model: "gpt-3.5-turbo",
    temperature: "0.7",
    maxTokens: "-1",
  },
  {
    id: "34e4b5f1-1b7a-4b8b-8aaf-e8d9a8f8c502",
    name: "Improve Grammar",
    description: "Correct grammatical errors and enhance the readability of the provided text, ensuring clarity and proper language use.",
    systemPrompt: "Improve the grammar and readability of the following text:",
    model: "gpt-3.5-turbo",
    temperature: "0.7",
    maxTokens: "-1",
  },
  {
    id: "9f34b8e2-4d93-4c9b-9e79-4228a3d0f97b",
    name: "Rewrite",
    description:
      "Rewrite the provided text to convey the same meaning in a different way, offering a fresh perspective or alternative wording.",
    systemPrompt: "Rewrite the following text to convey the same meaning in a different way:",
    model: "gpt-3.5-turbo",
    temperature: "0.7",
    maxTokens: "-1",
  },
  {
    id: "eabc2912-f2ad-4b5a-80d2-993b5f3e5c21",
    name: "Explain This Code",
    description:
      "Provide a detailed explanation of the provided code snippet, including its purpose, how it works, and any key concepts involved.",
    systemPrompt: "Explain the purpose and functionality of the following code snippet:",
    model: "gpt-3.5-turbo",
    temperature: "0.7",
    maxTokens: "-1",
  },
] as Action[];

export const useActionsState = createStore<ActionState>("actions", (set, get) => ({
  actions: initialState,

  addAction: (action: Omit<Action, "id">) => {
    set({
      actions: [
        ...get().actions,
        {
          id: randomUUID(),
          ...action,
        },
      ],
    });
  },
  removeAction: (id: string) => {
    set({
      actions: get().actions.filter((item) => item.id !== id),
    });
  },
  editAction: (action: Action) => {
    set({
      actions: get().actions.map((item) => (item.id === action.id ? action : item)),
    });
  },
}));

export const useActionsAreReady = () => {
  const [ready, setReady] = useState(false);

  useActionsState.persist.onFinishHydration(() => {
    setReady(true);
  });

  return ready;
};
