import { Color } from '@raycast/api'

// Status icons mapping - can have multiple icons per status
export const STATUS_ICONS = {
  'To-do': ['statuses/pending.svg'],
  'In progress': [
    'statuses/progress1.svg',
    'statuses/progress2.svg',
    'statuses/progress3.svg',
  ],
  Blocked: ['statuses/blocked.svg'],
  Complete: ['statuses/completed.svg'],
} as const

// Status groups mapping - maps status names to groups
export const STATUS_GROUPS = {
  'To-do': ['todo', 'not started', 'pending', 'backlog'],
  'In progress': ['in progress', 'in-progress', 'working', 'active', 'doing'],
  Blocked: [
    'blocked',
    'canceled',
    'cancelled',
    'on hold',
    'on-hold',
    'stopped',
    'paused',
  ],
  Complete: ['complete', 'completed', 'done', 'finished', 'closed'],
} as const

// Default status icons for different contexts
export const DEFAULT_STATUS_ICONS = {
  pending: 'statuses/pending.svg',
  progress: 'statuses/progress2.svg',
  blocked: 'statuses/blocked.svg',
  completed: 'statuses/completed.svg',
} as const

// Function to get the group name from a status name
export function getStatusGroup(statusName: string): keyof typeof STATUS_ICONS {
  const normalizedName = statusName.toLowerCase().trim()

  for (const [groupName, keywords] of Object.entries(STATUS_GROUPS)) {
    if (keywords.some((keyword) => normalizedName === keyword)) {
      return groupName as keyof typeof STATUS_ICONS
    }
  }

  // Default fallback
  return 'To-do'
}

// Simple utility function to get status icon
export function getStatusIcon(statusName: string, index = 0): string {
  const groupName = getStatusGroup(statusName)
  const icons = STATUS_ICONS[groupName]

  // Return the icon at the specified index, or the last one if index is out of bounds
  return icons[index] || icons[icons.length - 1]
}

// Simple utility function to get status color
export function getStatusColor(statusName: string): Color {
  const groupName = getStatusGroup(statusName)

  switch (groupName) {
    case 'To-do':
      return Color.SecondaryText
    case 'In progress':
      return Color.Blue
    case 'Blocked':
      return Color.Red
    case 'Complete':
      return Color.Green
    default:
      return Color.SecondaryText
  }
}

// Simple utility function to get complete status configuration
export function getStatusConfig(statusName: string, index = 0) {
  return {
    icon: getStatusIcon(statusName, index),
    color: getStatusColor(statusName),
  }
}
