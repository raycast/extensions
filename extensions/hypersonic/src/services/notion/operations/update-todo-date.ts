import { TodoPage } from '@/types/todo-page'
import { isNotionClientError } from '@notionhq/client'
import { getPreferenceValues, showToast, Toast } from '@raycast/api'
import { notion } from '../client'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function updateTodoDate(
  pageId: string,
  date: string | null
): Promise<any> {
  const dateProperty = getPreferenceValues().property_date
  try {
    const notionClient = await notion()
    const page = await notionClient.pages.update({
      page_id: pageId,
      properties: {
        [dateProperty]: {
          date: date
            ? {
                start: date,
              }
            : null,
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
        'Error occurred check that you have a Date property'
      )
    }
    return undefined
  }
}
