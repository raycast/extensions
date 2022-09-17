import { isNotionClientError } from '@notionhq/client'
import { showToast, Toast } from '@raycast/api'
import { notion } from '../client'

export async function deleteTodo(pageId: string): Promise<any> {
  try {
    const notionClient = await notion()
    await notionClient.pages.update({
      page_id: pageId,
      archived: true,
    })

    return true
  } catch (err: unknown) {
    if (isNotionClientError(err)) {
      showToast(Toast.Style.Failure, err.message)
    } else {
      showToast(Toast.Style.Failure, 'Error occurred')
    }
    return undefined
  }
}
