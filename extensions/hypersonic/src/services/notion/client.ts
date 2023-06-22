import { Client } from '@notionhq/client'
import { oauthClient } from '@/services/notion/oauth/client'

export async function notion() {
  const token = (await oauthClient.getTokens())?.accessToken

  if (!token) {
    throw new Error('Unauthorized, please sign in to Notion')
  }

  return new Client({
    auth: token,
  })
}
