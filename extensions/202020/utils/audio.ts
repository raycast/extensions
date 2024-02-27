import { environment } from '@raycast/api'
import { exec } from 'child_process'
import { cache } from './cache'
import type { AudioSettings } from './types'

const CACHE_KEY = '202020_isMuted'

function play(audioFileName: string) {
  exec(`afplay ${environment.assetsPath}/${audioFileName} --volume 0.3`)
}

function isMuted() {
  const result = cache.get(CACHE_KEY)

  if (!result) {
    console.warn('No audio settings found')
    return false
  }

  const parsedResult = JSON.parse(result) as AudioSettings
  return parsedResult.isMuted
}

function toggleMute(isMuted: boolean) {
  const newValue = { isMuted: !isMuted }
  cache.set(CACHE_KEY, JSON.stringify(newValue))
}
export default {
  play,
  isMuted,
  toggleMute,
}
