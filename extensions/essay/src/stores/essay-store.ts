import { getPreferenceValues } from "@raycast/api";
import { create } from "zustand";
import { Essay } from "../types";
import got from "got";

interface EssayState {
  createEssay: ({ content }: { content: string }) => Promise<Essay>;
  updateEssay: ({ id, content }: { id: string; content: string }) => Promise<Essay>;
  deleteEssay: (id: string) => Promise<void>;
}

const useEssayStore = create<EssayState>(() => ({
  createEssay: async ({ content }) => {
    const preferences = getPreferenceValues<Preferences>();
    const resp = await got
      .post(`${preferences.apiUrl}/essays`, {
        responseType: "json",
        headers: {
          Authorization: `Bearer ${preferences.apiKey}`,
        },
        json: {
          content,
        },
      })
      .json();
    return {
      id: resp.id,
      content,
    };
  },
  updateEssay: async ({ id, content }) => {
    const preferences = getPreferenceValues<Preferences>();
    await got
      .put(`${preferences.apiUrl}/essays/${id}`, {
        responseType: "json",
        headers: {
          Authorization: `Bearer ${preferences.apiKey}`,
        },
        json: {
          content,
        },
      })
      .json();
    return {
      id,
      content,
    };
  },
  deleteEssay: async (id) => {
    const preferences = getPreferenceValues<Preferences>();
    await got.delete(`${preferences.apiUrl}/essays/${id}`, {
      responseType: "json",
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    });
  },
}));

export default useEssayStore;
