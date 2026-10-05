// Raycast glue shared by the commands: the client from preferences, error/empty states, opening links.
import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from '@raycast/api'
import { cliRunner, jefiClient, JefiError, resolveJefiPath, type JefiClient } from './jefi'

type Prefs = { jefiPath?: string }

export function client(): JefiClient {
  const { jefiPath } = getPreferenceValues<Prefs>()
  return jefiClient(cliRunner(resolveJefiPath(jefiPath)))
}

// usePromise's onError: the list's empty view explains failures, so skip its default toast.
export function quiet() {}

export async function openInJefi(url: string) {
  try {
    await open(url)
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Couldn't open Jefi", message: String(e) })
  }
}

export function errorTitle(error: unknown): string {
  if (error instanceof JefiError && error.kind === 'not-installed') return 'Jefi isn’t installed'
  if (error instanceof JefiError && error.kind === 'outdated') return 'Update Jefi'
  return 'Jefi couldn’t answer'
}

// Replaces a list's body when a call failed: not-installed points at the preference, a CLI error shows
// Jefi's own message.
export function ErrorEmptyView({ error, retry }: { error: unknown; retry?: () => void }) {
  const missing = error instanceof JefiError && error.kind === 'not-installed'
  const outdated = error instanceof JefiError && error.kind === 'outdated'
  if (outdated) {
    return (
      <List.EmptyView
        icon={Icon.Download}
        title={errorTitle(error)}
        description={`${error.message}. Open Jefi and choose Check for Updates, or download the latest version.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Download Latest Jefi" url="https://jefi.app" />
            {retry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} /> : null}
          </ActionPanel>
        }
      />
    )
  }
  return (
    <List.EmptyView
      icon={missing ? Icon.QuestionMarkCircle : Icon.Warning}
      title={errorTitle(error)}
      description={
        missing
          ? `${error.message}. Install Jefi, or set its location in the extension preferences.`
          : error instanceof Error
            ? error.message
            : String(error)
      }
      actions={
        <ActionPanel>
          {missing ? (
            <Action.OpenInBrowser title="Get Jefi" url="https://jefi.app" />
          ) : retry ? (
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
          ) : null}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  )
}
