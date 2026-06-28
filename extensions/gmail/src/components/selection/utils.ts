export interface ListSelectionController<T> {
  deselect: (element: T) => void;
  select: (element: T) => void;
  deselectAll: () => void;
  isSelected: (element: T) => boolean;
  getSelected: () => T[];
  getSelectedKeys: () => string[];
}
