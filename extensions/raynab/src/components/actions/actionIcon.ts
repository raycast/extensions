import { Icon, Color } from '@raycast/api';

interface RenderActionIcons<T> {
  defaultIcon: Icon;
  selectedIcon?: Icon;
  currentType: T | null;
}

/**
 * Render the proper icon for each action depending on the current selection.
 */
export function renderActionIcon<T>({ defaultIcon, selectedIcon, currentType }: RenderActionIcons<T>) {
  return function (actionType: T) {
    if (actionType === currentType) return { source: selectedIcon ?? Icon.Checkmark, tintColor: Color.Green };

    return { source: defaultIcon, tintColor: Color.SecondaryText };
  };
}
