import { loadPreferences } from '@/services/storage'
import { User } from '@/types/user'
import { notion } from '../client'
import { normalizeUser } from '../utils/normalize-user'

export async function getUsers(): Promise<User[]> {
  const preferences = await loadPreferences()

  if (!preferences.properties.assignee) return []

  const notionClient = await notion()
  const users = await notionClient.users.list({})

  const normalizedUsers =
    users?.results
      ?.filter((user) => user.type === 'person')
      .map(normalizeUser)
      .sort((a, b) => a.name.localeCompare(b.name)) || []

  return normalizedUsers
}
