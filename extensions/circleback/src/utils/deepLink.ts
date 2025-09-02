import { open } from '@raycast/api'

const DESKTOP_APP_SCHEME = 'circleback://'

export function buildDesktopDeepLink(path: string): string {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${DESKTOP_APP_SCHEME}${normalizedPath}`
}

export async function openInDesktopApp(path: string) {
  const url = buildDesktopDeepLink(path)
  await open(url)
}

export function getMeetingDeepLink(meetingId: number) {
  return buildDesktopDeepLink(`/meetings/${meetingId}`)
}

export function getRecordPanelDeepLink() {
  return buildDesktopDeepLink('/meetings/new')
}
