import {
  environment,
  showHUD,
  showToast,
  Toast,
  LaunchProps,
  getPreferenceValues,
} from '@raycast/api'
import { promises as fs } from 'fs'
import { exec } from 'child_process'
import path from 'path'

const STORAGE_PATH: string = path.join(environment.supportPath, 'paths.json')

function isAppInstalled(appName: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`osascript -e 'id of app "${appName}"'`, (error) => {
      resolve(!error)
    })
  })
}

export default async function GoToPath(props: LaunchProps) {
  const preferences = getPreferenceValues()
  const terminalApp =
    preferences.defaultTerminal === 'iTerm' ? 'iTerm' : 'Terminal'
  const { alias } = props.arguments

  try {
    const paths = await fetchPaths()
    const pathToOpen = paths[alias]

    if (!pathToOpen) throw new Error(`Path alias "${alias}" not found.`)

    if (terminalApp === 'iTerm' && !(await isAppInstalled('iTerm'))) {
      throw new Error(`iTerm is not installed on your system.`)
    }

    await openTerminal(pathToOpen, terminalApp)
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Something went wrong',
      message: `${error}`,
    })
  }
}

function openTerminal(pathValue: string, terminalApp: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`open -a ${terminalApp} "${pathValue}"`, (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to open path in ${terminalApp}`,
          message: error.message,
        })
        reject(error)
      } else {
        showHUD('Path opened!')
        resolve()
      }
    })
  })
}

async function fetchPaths(): Promise<Record<string, string>> {
  try {
    const rawData = await fs.readFile(STORAGE_PATH, 'utf-8')
    return JSON.parse(rawData)
  } catch (error: unknown) {
    console.error('Failed to load paths:', error)
    return {} // Ensure we return an empty object in case of an error
  }
}
