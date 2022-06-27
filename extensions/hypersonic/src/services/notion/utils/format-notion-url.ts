import { getPreferenceValues } from '@raycast/api'

export const formatNotionUrl = (url: string) => {
  if (getPreferenceValues().open_in_native_app) {
    // Replace https:// for notion:// so we open the link in the native app
    return url.replace(/^https:\/\//, 'notion://')
  }

  return url
}
