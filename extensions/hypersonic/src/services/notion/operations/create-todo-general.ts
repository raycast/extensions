import { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints'
import { loadDatabase } from '@/services/storage'
import { mapPageToTodo } from '../utils/map-page-to-todo'
import { Todo } from '@/types/todo'
import { notion } from '../client'
import { TodoPage } from '@/types/todo-page'
import { isNotionClientError } from '@notionhq/client'
import { getPreferenceValues, showToast, Toast } from '@raycast/api'

export async function createTodoGeneral(props: any): Promise<Todo> {
  try {
    const database = await loadDatabase()
    const preferences = getPreferenceValues()

    const arg: CreatePageParameters = {
      parent: { database_id: database.databaseId },
      properties: {
        [preferences.property_title]: {
          title: [
            {
              text: {
                content: props.title,
              },
            },
          ],
        },
        [preferences.property_label]: {
          select: props.tagId ? { id: props.tagId } : null,
        },
      },
    }

    const notionClient = await notion()
    const page = await notionClient.pages.create(arg)

    return mapPageToTodo(page as TodoPage)
  } catch (err: any) {
    if (isNotionClientError(err)) {
      showToast(Toast.Style.Failure, err.message)
    } else {
      showToast(Toast.Style.Failure, 'Error occurred')
    }
    throw new Error(err.message)
  }
}
