import { BrandedLink } from "./types";

import create, { State } from "zustand";

interface RebrandlyStore extends State {
  isLoading: boolean;
  links: BrandedLink[];
  pushLinks: (...next: BrandedLink[]) => void;
}

export const useStore = create<RebrandlyStore>((set, get) => ({
  isLoading: true,
  links: [],
  pushLinks: (...next) => set({ links: [...get().links, ...next] }),
}));
