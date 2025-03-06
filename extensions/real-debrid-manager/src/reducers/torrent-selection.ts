import { TorrentFile } from "../schema";

export type Action = { type: "toggle"; id: number } | { type: "select_all" } | { type: "deselect_all" };

export const reducer = (state: TorrentFile[], action: Action): TorrentFile[] => {
  switch (action.type) {
    case "toggle":
      return state.map((file) => (file.id === action.id ? { ...file, selected: file.selected ? 0 : 1 } : file));
    case "select_all":
      return state.map((file) => ({ ...file, selected: 1 }));
    case "deselect_all":
      return state.map((file) => ({ ...file, selected: 0 }));
    default:
      return state;
  }
};
