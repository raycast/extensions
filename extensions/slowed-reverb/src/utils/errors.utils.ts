import { showToast } from '@raycast/api'
import { showFailureToast } from '@raycast/utils'

type ToastErrorMessage = unknown
export type ToastType = {
  title: string
  emoji?: string
}

const CONSTANTS = {
  noSoxInstalled: 'sox is not installed. please install it via homebrew',
  noSongsSelected: 'no songs selected'
}

const throwError = (message: string) => {
  throw new Error(message)
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message.toLowerCase()
  return String(error).toLowerCase()
}

const showToastError = async (error: ToastErrorMessage) => {
  await showFailureToast(error, { title: `${getErrorMessage(error)}  ❌` })
}

const showToastSuccess = async ({ title, emoji = '🎉' }: ToastType) => {
  await showToast({ title: `${title}  ${emoji}`.trim() })
}

export const errorUtils = {
  CONSTANTS,
  throwError,
  getErrorMessage,
  showToastError,
  showToastSuccess
}
