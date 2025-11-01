/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import { useState } from "react";
import extension from "../../extension.json";
import { Action } from "../types";
import { Colors, createStore } from "../utils";

interface ActionState {
  actions: Action[];
  addAction: (action: Omit<Action, "id">) => void;
  editAction: (action: Action) => void;
  removeAction: (id: string) => void;
  addToFavorites: (id: string) => void;
  removeFromFavorites: (id: string) => void;
}

const initialState: Action[] = [
  {
    id: "b0259928-4a63-4e27-9d3b-df76c6a8e290",
    name: "Summarize",
    color: Colors.Blue,
    description: "Provide a concise summary of the provided text, highlighting the main points and key information.",
    systemPrompt: "You will be provided with text and your task is to summarize the key points and main information.",
    model: "gpt-4o-mini",
    temperature: "0.7",
    maxTokens: "-1",
    favorite: false,
  },
  {
    id: "34e4b5f1-1b7a-4b8b-8aaf-e8d9a8f8c502",
    name: "Improve Grammar",
    color: Colors.Blue,
    description: "Correct grammatical errors and enhance the readability of the provided text, ensuring clarity and proper language use.",
    systemPrompt: "You will be provided with text and your task is to improve the grammar and readability.",
    model: "gpt-4o-mini",
    temperature: "0.7",
    maxTokens: "-1",
    favorite: false,
  },
  {
    id: "9f34b8e2-4d93-4c9b-9e79-4228a3d0f97b",
    name: "Rewrite",
    color: Colors.Blue,
    description:
      "Rewrite the provided text to convey the same meaning in a different way, offering a fresh perspective or alternative wording.",
    systemPrompt: "You will be provided with text and your task is to convey the same meaning in a different way.",
    model: "gpt-4o-mini",
    temperature: "0.7",
    maxTokens: "-1",
    favorite: false,
  },
  {
    id: "eabc2912-f2ad-4b5a-80d2-993b5f3e5c21",
    name: "Explain This Code",
    color: Colors.Orange,
    description:
      "Provide a detailed explanation of the provided code snippet, including its purpose, how it works, and any key concepts involved.",
    systemPrompt: "You will be provided with a code snippet and your task is to explain how it works and its purpose.",
    model: "gpt-4o-mini",
    temperature: "0.7",
    maxTokens: "-1",
    favorite: false,
  },
] as Action[];

export const useActionsState = createStore<ActionState>({
  name: "actions",
  version: extension.version,
  state: (set, get) => ({
    actions: initialState,

    addAction: (action: Omit<Action, "id">) => {
      set({
        actions: [
          ...get().actions,
          {
            ...action,
            id: randomUUID(),
            favorite: false,
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
    addToFavorites: (id: string) => {
      set({
        actions: get().actions.map((item) => (item.id === id ? { ...item, favorite: true } : item)),
      });
    },
    removeFromFavorites: (id: string) => {
      set({
        actions: get().actions.map((item) => (item.id === id ? { ...item, favorite: false } : item)),
      });
    },
  }),
  migrate: (persistedState: any, version: number) => {
    switch (version) {
      case 1: // Migrate from v1 to v2, update model names from gpt-4-turbo-preview to gpt-4-turbo
        persistedState.actions = persistedState.actions.map((action: Action) => ({
          ...action,
          model: action.model.replace("gpt-4-turbo-preview", "gpt-4-turbo"),
        }));
    }

    return persistedState;
  },
});

export const useActionsAreReady = () => {
  const [ready, setReady] = useState(false);

  useActionsState.persist.onFinishHydration(() => {
    setReady(true);
  });

  return ready;
};
