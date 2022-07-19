import { Todo } from '@/types/todo'
import { getPreferenceValues } from '@raycast/api'
import { formatNotionUrl } from './format-notion-url'
import { getDateOverdue } from './get-date-overdue'
import { getTitleUrl } from './get-title-url'
import { mapPageTag } from './map-page-tag'

export const mapPageToTodo = (page: any): Todo => {
  const preferences = getPreferenceValues()
  return {
    id: page.id,
    title: page.properties[preferences.property_title].title[0].text.content,
    isCompleted: page.properties[preferences.property_done].checkbox,
    isOverdue:page.properties[preferences.property_date].date?getDateOverdue(page.properties[preferences.property_date].date.start):false,
    isCancelled:
      preferences.property_cancel != ''
        ? page.properties[preferences.property_cancel].checkbox
        : false,
    tag: page.properties[preferences.property_label].select
      ? mapPageTag(page.properties[preferences.property_label].select)
      : null,
    url: formatNotionUrl(page.url),
    contentUrl: getTitleUrl(
      page.properties[preferences.property_title].title[0].text.content
    ),
    dueDate: page.properties[preferences.property_date].date?page.properties[preferences.property_date].date.start:null,
  }
}
