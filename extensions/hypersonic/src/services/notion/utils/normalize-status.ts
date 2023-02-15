import { Status } from '@/types/status'
import { notionColorToStatusColor } from './notion-color-to-status-color'

const ICONS = {
  'To-do': ['pending.svg'],
  'In progress': ['progress1.svg', 'progress2.svg', 'progress3.svg'],
  Complete: ['completed.svg'],
}

export const normalizeStatus = (
  status: any,
  statusIdWithGroupName: Record<string, { name: string; index: number }>
): Status => {
  const group = statusIdWithGroupName[status.id].name as keyof typeof ICONS
  const groupIcons = ICONS[group]
  let icon =
    groupIcons[statusIdWithGroupName[status.id].index] ||
    groupIcons[groupIcons.length - 1]

  const isSpecial =
    status.name.toLowerCase() === 'blocked' ||
    status.name.toLowerCase() === 'canceled'

  if (isSpecial) {
    icon = 'blocked.svg'
  }

  const color = status.color
    ? notionColorToStatusColor(status.color)
    : notionColorToStatusColor('default')

  return {
    ...status,
    icon,
    color,
  }
}
