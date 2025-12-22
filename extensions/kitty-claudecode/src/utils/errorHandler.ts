/**
 * Error handling utilities
 */

import { showToast, Toast } from '@raycast/api'

export interface ErrorContext {
  operation: string
  error: unknown
  showToast?: boolean
}

/**
 * Handle and log errors
 */
export const handleError = async ({
  operation,
  error,
  showToast: shouldShowToast = true,
}: ErrorContext): Promise<string> => {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const fullMessage = `${operation} failed: ${errorMessage}`

  console.error(`[ERROR] ${operation}:`, error)

  if (shouldShowToast) {
    await showToast({
      style: Toast.Style.Failure,
      title: operation,
      message: errorMessage,
    })
  }

  return fullMessage
}

/**
 * Handle success messages
 */
export const handleSuccess = async (message: string, title: string = 'Success') => {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  })
}

/**
 * Create a custom error with context
 */
export class KittyAPIError extends Error {
  constructor(operation: string, originalError: unknown) {
    const message = originalError instanceof Error ? originalError.message : String(originalError)
    super(`${operation} failed: ${message}`)
    this.name = 'KittyAPIError'
  }
}

/**
 * Validate that kitty is available
 */
export const validateKittyAvailability = async (): Promise<boolean> => {
  try {
    const { checkKittyAvailability } = await import('./kittyAPI')
    const isAvailable = await checkKittyAvailability()

    if (!isAvailable) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Kitty not found',
        message: 'Please install Kitty terminal emulator from https://sw.kovidgoyal.net/kitty/',
      })
      return false
    }

    return true
  } catch (error) {
    await handleError({
      operation: 'Validate Kitty availability',
      error,
    })
    return false
  }
}

/**
 * Validate Kitty remote control configuration
 */
export const validateKittyRemoteControl = async (): Promise<boolean> => {
  try {
    const { listKittyWindows } = await import('./kittyAPI')
    await listKittyWindows()
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Check for TTY-related errors
    if (errorMessage.includes('device not configured') || errorMessage.includes('/dev/tty')) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Kitty Remote Control Not Configured',
        message:
          'Add "allow_remote_control yes" and "listen_on unix:/tmp/kitty" to ~/.config/kitty/kitty.conf and restart Kitty',
      })
    } else if (
      errorMessage.includes('Permission denied') ||
      errorMessage.includes('Access denied')
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Kitty Permission Error',
        message: 'Ensure Kitty is running and remote control is enabled',
      })
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Kitty Communication Error',
        message: 'Check that Kitty is running and properly configured',
      })
    }

    return false
  }
}

/**
 * Check if socket path is valid
 */
export const validateSocketPath = (socketPath: string): boolean => {
  if (!socketPath || socketPath.trim() === '') {
    return false
  }

  // Basic path validation
  return socketPath.startsWith('/') || socketPath.startsWith('unix:')
}
