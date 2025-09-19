import { open, showToast, Toast } from "@raycast/api"

export async function openSerialPlotterUrl(url: string, successMessage: string): Promise<void> {
  const fullUrl: string = `serialplotter://${url}`

  try {
    await open(fullUrl)
    await showToast(Toast.Style.Success, successMessage)
  } catch {
    await showToast(Toast.Style.Failure, "Failed to open URL.")
  }
}
