import { LocalStorage } from '@raycast/api'

export async function timeCheck() {
  const lastTime = await LocalStorage.getItem('nb-docs:lastTime')
  if (!lastTime) {
    await LocalStorage.setItem('nb-docs:lastTime', Date.now())
    return true
  } else {
    // @ts-expect-error lastTime is already a number
    const timeDiff = Date.now() - lastTime
    const timeDiffInMinutes = timeDiff
    if (timeDiffInMinutes > 60) {
      await LocalStorage.setItem('nb-docs:lastTime', Date.now())
      return true
    } else {
      return false
    }
  }
}
