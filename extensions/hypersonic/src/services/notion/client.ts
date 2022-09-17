import { Client } from '@notionhq/client'
import { oauthClient } from '@/services/notion/oauth/client'

export async function notion() {
  const token = (await oauthClient.getTokens())?.accessToken

  return new Client({
    auth: token,
  })
}
