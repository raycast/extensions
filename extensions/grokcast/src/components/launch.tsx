// Opening one Grokcast command from another. `launchCommand` fails when the user
// turned the command off, so every launch shows what to do instead.

import { Action, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api"

/** The commands one command opens, with their titles from package.json. */
const TITLES = {
  account: "Grok Account",
  "dictation-history": "Dictation History",
  "generate-image": "Generate Image",
  "image-history": "Image History",
} as const

export type CommandName = keyof typeof TITLES

/** Open a Grokcast command, or show a failure toast that says how to turn it on. */
export const openCommand = (name: CommandName, context?: { readonly signIn: boolean }) =>
  launchCommand({ name, type: LaunchType.UserInitiated, context }).catch(() =>
    showToast({
      style: Toast.Style.Failure,
      title: `Could Not Open ${TITLES[name]}`,
      message: `Turn on ${TITLES[name]} in Raycast Settings › Extensions › Grokcast.`,
    }),
  )

/** Open Grok Account and start signing in. */
export const signIn = () => openCommand("account", { signIn: true })

export function SignInAction() {
  return <Action title="Sign in to Grok" icon={Icon.Person} onAction={() => void signIn()} />
}
