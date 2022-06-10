import { Todo } from '@/types/todo'
import { formatNotionUrl } from './format-notion-url'
import { getTitleUrl } from './get-title-url'
import { mapPageTag } from './map-page-tag'

export const mapPageToTodo = (page: any): Todo => {
  return {
    id: page.id,
    title: page.properties.Title.title[0].text.content,
    isCompleted: page.properties.Done.checkbox,
    tag: page.properties.Label.select
      ? mapPageTag(page.properties.Label.select)
      : null,
    url: formatNotionUrl(page.url),
    contentUrl: getTitleUrl(page.properties.Title.title[0].text.content),
  }
}
