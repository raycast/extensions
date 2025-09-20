import { create } from "zustand";

type ViewingWorktreesState = { selectedWorktree: string | undefined };

type ViewingWorktreesActions = {
  updateSelectedWorktree: (newWorktree: string | undefined) => void;
};

type ViewingWorktreesStore = ViewingWorktreesState & ViewingWorktreesActions;

export const useViewingWorktreesStore = create<ViewingWorktreesStore>((set) => ({
  selectedWorktree: undefined,
  updateSelectedWorktree: (selectedWorktree) => set({ selectedWorktree }),
}));
