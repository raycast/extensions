import { Status } from '@/types/status'
import { notionColorToStatusColor } from './notion-color-to-status-color'
import { getStatusConfig } from '@/utils/statuses'

export const normalizeStatus = (
  status: any,
  statusIdWithGroupName: Record<string, { name: string; index: number }>
): Status => {
  const statusName = status.name
  const index = statusIdWithGroupName[status.id]?.index || 0

  // Get status configuration using the status name (group mapping is handled automatically)
  const statusConfig = getStatusConfig(statusName, index)

  // Use Notion color if available, otherwise use our default color
  const color = status.color
    ? notionColorToStatusColor(status.color)
    : statusConfig.color

  return {
    ...status,
    icon: statusConfig.icon,
    color,
  }
}
