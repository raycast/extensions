import { Todo } from '@/types/todo'
import { PreferenceValues } from '@raycast/api'
import { formatNotionUrl } from './format-notion-url'
import { getTitleUrl } from './get-title-url'
import { mapPageTag } from './map-page-tag'

export const mapPageToTodo = (
  page: any,
  preferences: PreferenceValues,
  inProgressId: string | null = null
): Todo => {
  return {
    id: page.id,
    title:
      page.properties[preferences.property_title]?.title[0]?.text?.content ||
      'Untitled',
    isCompleted: page.properties[preferences.property_done].checkbox,
    tag: page.properties[preferences.property_label].select
      ? mapPageTag(page.properties[preferences.property_label].select)
      : null,
    url: formatNotionUrl(page.url),
    contentUrl: getTitleUrl(
      page.properties[preferences.property_title]?.title[0]?.text?.content
    ),
    inProgress:
      page.properties[preferences.property_done]?.status?.id === inProgressId,
  }
}
