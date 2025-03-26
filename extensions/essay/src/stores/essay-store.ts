import { getPreferenceValues } from "@raycast/api";
import { ENDPOINT } from "../settings";
// @ts-expect-error got is not a module
import got from "got";
import { create } from "zustand";
import { Essay } from "../types";

interface EssayState {
  createEssay: ({ content }: { content: string }) => Promise<Essay>;
  updateEssay: ({ id, content }: { id: string; content: string }) => Promise<Essay>;
  deleteEssay: (id: string) => Promise<void>;
}

const useEssayStore = create<EssayState>(() => ({
  createEssay: async ({ content }) => {
    const preferences = getPreferenceValues<Preferences>();
    const resp = await got
      .post(`${ENDPOINT}/essays`, {
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
      .put(`${ENDPOINT}/essays/${id}`, {
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
    console.log("deleteEssay", `${ENDPOINT}/essays/${id}`);
    await got.delete(`${ENDPOINT}/essays/${id}`, {
      responseType: "json",
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    });
  },
}));

export default useEssayStore;
