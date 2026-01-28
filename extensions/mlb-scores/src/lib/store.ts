import { create } from "zustand";
import FeedInterface from "../interfaces/feed";

interface GameDataState {
  data: Array<[boolean, FeedInterface | undefined]> | undefined;
  setData: (data: Array<[boolean, FeedInterface | undefined]>) => void;
}

const useGameDataStore = create<GameDataState>((set) => ({
  data: undefined,
  setData: (data) => set({ data }),
}));

export default useGameDataStore;
