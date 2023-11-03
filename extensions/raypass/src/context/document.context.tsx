import type { LocalDocumentReference } from "../types";
import createStore from "zustand/vanilla";

interface DocumentState {
  ref: LocalDocumentReference | null;
  password: string | undefined;
  setRef: (ref: LocalDocumentReference | null) => void;
  setPassword: (password: string | undefined) => void;
}

export const documentStore = createStore<DocumentState>((set) => ({
  ref: null,
  password: undefined,
  setRef: (ref) => set({ ref }),
  setPassword: (password) => set({ password }),
}));
