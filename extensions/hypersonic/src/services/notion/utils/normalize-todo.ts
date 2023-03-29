import { Preferences } from '@/services/storage'
import { Todo } from '@/types/todo'
import { User } from '@/types/user'
import { formatNotionUrl } from './format-notion-url'
import { getContentUrl } from './get-content-url'
import { normalizeTag } from './normalize-tag'
import { normalizeUser } from './normalize-user'

export const normalizeTodo = ({
  page,
  preferences,
}: {
  page: any
  preferences: Preferences['properties']
}): Todo => {
  const dateValue = page.properties[preferences.date]?.date?.start || null

  const urlProperty = preferences?.url
    ? page.properties[preferences.url]?.url
    : null

  const contentUrl = getContentUrl(
    page.properties[preferences.title]?.title[0]?.text?.content,
    urlProperty
  )

  const title =
    page.properties[preferences.title]?.title[0]?.text?.content || 'Untitled'

  const titleWithGlyph = contentUrl ? `${title} ↗` : title

  return {
    id: page.id,
    title: titleWithGlyph,
    tag: preferences.tag
      ? page.properties[preferences.tag].select
        ? normalizeTag(page.properties[preferences.tag].select)
        : null
      : null,
    url: formatNotionUrl(page.url),
    shareUrl: page.url,
    contentUrl,
    status: {
      ...page.properties[preferences.status.name]?.status,
    },
    projectId: preferences.project
      ? page.properties[preferences.project]?.relation[0]?.id
      : null,
    user: preferences.assignee
      ? normalizeUserOrPeople(page.properties[preferences.assignee])
      : null,
    dateValue: dateValue,
    date: dateValue ? new Date(dateValue) : null,
  }
}

const normalizeUserOrPeople = (item: any): User | null => {
  if (item.type === 'person') {
    return normalizeUser(item)
  }

  if (item.type === 'people') {
    const person = item.people[0]

    if (!person) return null

    return normalizeUser(person)
  }

  return null
}
