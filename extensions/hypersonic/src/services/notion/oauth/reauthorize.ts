import { authorize } from './authorize'
import { oauthClient } from './client'

export async function reauthorize(): Promise<string | null> {
  await oauthClient.removeTokens()
  const token = await authorize()
  return token
}
