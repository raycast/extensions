import { closeMainWindow, getDefaultApplication, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { IPreferences } from "../types";
import { adminFetchUser, adminFetchActorToken } from "./admin-data";
import { APP_URL } from "./consts";

async function getDefaultBrowser() {
  const defaultApplication = await getDefaultApplication('https://www.google.com')

  return defaultApplication
}

async function openUrlInArcSpace(url: string, space: string) {
  const script = `
    tell application "Arc"
      tell front window
        tell space "${space}"
          make new tab with properties {URL:"${url}"}
        end tell
      end tell
      activate front window
    end tell
  `

  runAppleScript(script)
}

export async function openUrlInDefaultBrowser(url: string) {
  const { useArcSpace } = getPreferenceValues<IPreferences>();

  if (useArcSpace) {
    openUrlInArcSpace(url, useArcSpace)
  } else {
    const defaultBrowser = await getDefaultBrowser();

    const script = `
      tell application "${defaultBrowser.name}"
        open location "${url}"
      end tell
    `
  
    runAppleScript(script)
  }
  
  await closeMainWindow()
}

export async function impersonateUser(id: number, adminToken: string, url?: string) {
  showToast({
    title: 'Fetching token',
    style: Toast.Style.Animated
  })

  try {
    const [{ owner }, { token }] = await Promise.all([
      adminFetchUser(id, adminToken),
      adminFetchActorToken(id, adminToken)
    ])

    if (url) {
      await openUrlInDefaultBrowser(`${url}?user_id=${id}&token=${token}`)
    } else if (owner) {
      await openUrlInDefaultBrowser(`${APP_URL}/dashboard?user_id=${id}&token=${token}`)
    } else {
      await openUrlInDefaultBrowser(`${APP_URL}/?user_id=${id}&token=${token}`)
    }

    showToast({
      title: 'Success',
      style: Toast.Style.Success
    })
  } catch (error) {
    showFailureToast(error, {
      title: 'Error fetching token'
    })
  }
}
