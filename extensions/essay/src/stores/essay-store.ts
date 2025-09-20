import { create } from "zustand";
import { Essay } from "../types";
import api from "../libs/api";

interface EssayState {
  createEssay: ({ content }: { content: string }) => Promise<Essay>;
  updateEssay: ({ id, content }: { id: string; content: string }) => Promise<Essay>;
  deleteEssay: (id: string) => Promise<void>;
}

const useEssayStore = create<EssayState>(() => ({
  createEssay: async ({ content }) => {
    const { data } = await api.post("/essays", {
      content,
    });
    return {
      id: data.id,
      content,
    };
  },
  updateEssay: async ({ id, content }) => {
    await api.put(`/essays/${id}`, {
      content,
    });
    return {
      id,
      content,
    };
  },
  deleteEssay: async (id) => {
    await api.delete(`/essays/${id}`);
  },
}));

export default useEssayStore;
