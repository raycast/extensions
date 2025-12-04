import { showToast, Toast } from '@raycast/api'

export const showSuccessToast = async (title: string, message?: string): Promise<void> => {
    await showToast({
        style: Toast.Style.Success,
        title,
        message,
    })
}

export const showErrorToast = async (title: string, message?: string): Promise<void> => {
    await showToast({
        style: Toast.Style.Failure,
        title,
        message,
    })
}

export const showLoadingToast = async (title: string, message?: string): Promise<Toast> => {
    return await showToast({
        style: Toast.Style.Animated,
        title,
        message,
    })
}

export const showInfoToast = async (title: string, message?: string): Promise<void> => {
    await showToast({
        style: Toast.Style.Success,
        title,
        message,
    })
}

export const handleAsyncError = async (error: Error | unknown, title: string): Promise<void> => {
    console.error(title, error)

    const message = error instanceof Error ? error.message : 'An unexpected error occurred'

    await showErrorToast(title, message)
}
