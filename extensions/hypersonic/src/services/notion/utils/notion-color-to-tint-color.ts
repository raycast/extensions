import { Color } from '@raycast/api'

export function notionColorToTintColor(notionColor: string | undefined): Color {
  const colorMapper = {
    default: Color.PrimaryText,
    gray: Color.PrimaryText,
    brown: Color.Brown,
    red: Color.Red,
    blue: Color.Blue,
    green: Color.Green,
    yellow: Color.Yellow,
    orange: Color.Orange,
    purple: Color.Purple,
    pink: Color.Magenta,
  } as Record<string, Color>

  if (notionColor === undefined) {
    return colorMapper['default']
  }
  return colorMapper[notionColor]
}
