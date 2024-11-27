export function notionColorToStatusColor(
  notionColor: string | undefined
): string {
  const colorMapper = {
    default: {
      light: '#93959C',
      dark: '#666666',
    },
    gray: {
      light: '#656871',
      dark: '#7D818C',
    },
    brown: {
      light: '#A67937',
      dark: '#BE8550',
    },
    orange: {
      light: '#D0742F',
      dark: '#EC8C44',
    },
    yellow: {
      light: '#DA9E2E',
      dark: '#E5BF5B',
    },
    green: {
      light: '#0CA16C',
      dark: '#49BC99',
    },
    blue: {
      light: '#367BCB',
      dark: '#4494F2',
    },
    purple: {
      light: '#5E6ECE',
      dark: '#6F83F5',
    },
    pink: {
      light: '#B865D6',
      dark: '#DB8EF7',
    },
    red: {
      light: '#C84C56',
      dark: '#ED5D68',
    },
  } as Record<string, any>

  if (notionColor === undefined) {
    return colorMapper['default']
  }

  return colorMapper[notionColor]
}
