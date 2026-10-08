import { Color } from '@raycast/api';
import { TransactionFlagColor } from 'ynab';

/**
 * Match YNAB flag colors with Raycast colors
 */
export function getFlagColor(color: TransactionFlagColor | null | undefined) {
  const stringColor = color?.toString();
  switch (stringColor) {
    case 'red':
      return Color.Red;
    case 'green':
      return Color.Green;
    case 'purple':
      return Color.Purple;
    case 'orange':
      return Color.Orange;
    case 'blue':
      return Color.Blue;
    default:
      return;
  }
}

/**
 * Return one of the predefined colors from the Raycast API
 * Useful when trying to color a list of items
 */
export function easyGetColorFromId(id: number) {
  switch (id % 6) {
    case 0:
      return Color.Green;
    case 1:
      return Color.Blue;
    case 2:
      return Color.Magenta;
    case 3:
      return Color.Orange;
    case 4:
      return Color.Purple;
    case 5:
      return Color.Red;
    case 6:
      return Color.Yellow;
    default:
      throw `Can't really happen lol`;
  }
}
