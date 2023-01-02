import { Clipboard, openExtensionPreferences, showToast, Toast } from '@raycast/api'

export function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message
  return String(e)
}

export function showToastError(e: unknown, title: string) {
  console.log(e)
  showToast({
    style: Toast.Style.Failure,
    title,
    message: getErrorMessage(e),
    primaryAction: { title: 'Open Preferences', onAction: () => openExtensionPreferences() },
    secondaryAction: { title: 'Copy Error', onAction: () => Clipboard.copy(getErrorMessage(e)) },
  }).then()
}
