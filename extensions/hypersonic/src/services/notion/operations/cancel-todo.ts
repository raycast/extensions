import { TodoPage } from '@/types/todo-page'
import { isNotionClientError } from '@notionhq/client'
import { getPreferenceValues, showToast, Toast } from '@raycast/api'
import { notion } from '../client'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function cancelTodo(pageId: string, value: boolean): Promise<any> {
  try {
    const notionClient = await notion()
    const cancelProperty = getPreferenceValues().property_cancel
    const page = await notionClient.pages.update({
      page_id: pageId,
      properties: {
        [cancelProperty]: {
          checkbox: value,
        },
      },
    })

    return mapPageToTodo(page as TodoPage)
  } catch (err: unknown) {
    if (isNotionClientError(err)) {
      showToast(Toast.Style.Failure, err.message)
    } else {
      showToast(
        Toast.Style.Failure,
        'Error occurred check that you have a Cancel property'
      )
    }
    return undefined
  }
}
