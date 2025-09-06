import { getApplications, open } from '@raycast/api'
import { APP_URL } from '../constants/raycast'

const DESKTOP_APP_SCHEME = 'circleback://'
const CIRCLEBACK_APP_NAME = 'Circleback'

async function isDesktopAppInstalled() {
  const systemApps = await getApplications()
  const userApps = await getApplications('~/Applications')
  const hasAppInstalled = (apps: typeof systemApps) =>
    apps.some(({ name }) => name === CIRCLEBACK_APP_NAME)
  return hasAppInstalled(systemApps) || hasAppInstalled(userApps)
}

function buildDesktopDeepLink(path: string): string {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${DESKTOP_APP_SCHEME}${normalizedPath}`
}

function buildWebUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${APP_URL}${normalizedPath}`
}

async function resolveUrl(path: string): Promise<string> {
  if (await isDesktopAppInstalled()) return buildDesktopDeepLink(path)
  return buildWebUrl(path)
}

export async function openMeeting(meetingId: number) {
  const url = await resolveUrl(`/meetings/${meetingId}`)
  await open(url)
}

export async function openNewMeeting() {
  const url = await resolveUrl('/meetings/new')
  await open(url)
}
