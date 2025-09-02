import { showHUD, open } from '@raycast/api'
import { fetchJson } from './utils/api'
import { getMeetingDeepLink } from './utils/deepLink'
import { oauthService } from './utils/oauth'
import { withAccessToken } from '@raycast/utils'

type Meeting = {
  id: number
  name: string
  createdAt: string | Date
}

const openLastMeeting = async () => {
  const meetings = await fetchJson<Meeting[]>('/api/user/meetings')
  const latest = meetings[0]
  if (!latest) {
    await showHUD('No meetings found')
    return
  }
  const url = getMeetingDeepLink(latest.id)
  await open(url)
  await showHUD('Opening last meeting')
}

export default withAccessToken(oauthService)(openLastMeeting)
