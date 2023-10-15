import create from "zustand";

interface Refresh {
  refresh: number;
  setRefresh: (value: number) => void;
}

const useStore = create<Refresh>((set) => ({
  refresh: 0,
  setRefresh: (refresh) =>
    set(() => ({
      refresh,
    })),
}));

export default useStore;
