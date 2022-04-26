import { showToast, Toast } from '@raycast/api'
import axios from 'axios'
import { ErrorT } from './types'

const NoBackendError = new Error('No avaliable backend')
const getErrorMessage = (error: unknown): ErrorT => {
  if (error === NoBackendError) {
    return { title: NoBackendError.message, info: 'Configure in Backends' }
  } else if (axios.isAxiosError(error) && error.response?.status === 401) {
    return { title: 'Request failed', info: 'Please check your xKey availability' }
  } else {
    return { title: 'Request failed', info: 'Please check your Surge status and Backends setting' }
  }
}

const ErrorHandler = async (error: unknown) => {
  const { title, info } = getErrorMessage(error)
  await showToast(Toast.Style.Failure, title, info)
}

export { ErrorHandler, getErrorMessage, NoBackendError }
