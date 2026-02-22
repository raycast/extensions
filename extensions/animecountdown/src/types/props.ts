import { AnimeItem } from "../models/AnimeItem";
import { AnimeViewType } from "./anime";

/** Props for the shared AnimeActions component. */
export interface AnimeActionsProps {
  anime: AnimeItem;
  viewType: AnimeViewType;
  sortByHype: boolean;
  onViewTypeChange: (newViewType: AnimeViewType) => void;
  onSortToggle: () => void;
  onLayoutToggle: () => void;
  isGridView?: boolean;
}

/** Props for the List View layout item. */
export interface AnimeListItemProps {
  anime: AnimeItem;
  viewType: AnimeViewType;
  /** Current timestamp used to calculate relative countdown timer. */
  now: number;
  onViewTypeChange: (newViewType: AnimeViewType) => void;
  sortByHype: boolean;
  onSortToggle: () => void;
  onLayoutToggle: () => void;
}

/** Props for the Grid View layout item. */
export interface AnimeGridItemProps {
  anime: AnimeItem;
  viewType: AnimeViewType;
  /** Current timestamp used to calculate relative countdown timer. */
  now: number;
  onViewTypeChange: (newViewType: AnimeViewType) => void;
  sortByHype: boolean;
  onSortToggle: () => void;
  onLayoutToggle: () => void;
}
