import { Toast, showToast } from '@raycast/api'
import { RequestFailureError } from 'jike-sdk/index'

export const handleError = async (err: any) => {
  if (err instanceof RequestFailureError) {
    console.error(err.response.data)
    await showToast({
      title: err.message,
      style: Toast.Style.Failure,
    })
  } else {
    console.error(err)
    throw err
  }
}
