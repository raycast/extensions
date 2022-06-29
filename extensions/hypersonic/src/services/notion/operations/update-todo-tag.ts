import { TodoPage } from '@/types/todo-page'
import { isNotionClientError } from '@notionhq/client'
import { showToast, Toast } from '@raycast/api'
import { notion } from '../client'
import { mapPageToTodo } from '../utils/map-page-to-todo'

export async function updateTodoTag(
  pageId: string,
  labelId: string | null
): Promise<any> {
  try {
    const notionClient = await notion()
    const page = await notionClient.pages.update({
      page_id: pageId,
      properties: {
        Label: {
          select: labelId ? { id: labelId } : null,
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
        'Error occurred check that you have a Label property'
      )
    }
    return undefined
  }
}
