import { cache } from './cache'
import { MIN_IN_MS } from './constants'
import { INTERVALS, getNextInterval } from './interval'
import type { CurrentSession, IntervalName } from './types'

const SESSION_CACHE_KEY = '202020_currentSession'

function getTimeRemainingMessage(timeRemainingMs: number) {
  const minutes = Math.floor(timeRemainingMs / MIN_IN_MS)
  const seconds = Math.floor((timeRemainingMs % MIN_IN_MS) / 1000)
  const minutesPrefix = minutes < 10 ? '0' : ''
  const secondsPrefix = seconds < 10 ? '0' : ''

  return `${minutesPrefix}${minutes}:${secondsPrefix}${seconds} remaining`
}

function getCurrentSession() {
  const endTime = cache.get(SESSION_CACHE_KEY)
  if (!endTime) return null

  return JSON.parse(endTime) as CurrentSession
}

function createSession(interval: IntervalName) {
  const currentTime = new Date().getTime()
  const session = {
    endTime: currentTime + INTERVALS[interval].duration,
    interval,
  }

  cache.set(SESSION_CACHE_KEY, JSON.stringify(session))
  return session
}

function startNewSession() {
  const currentSession = getCurrentSession()

  if (currentSession) {
    console.warn('Found existing session, returning early...')
    return null
  }

  return createSession('screen')
}

function startNextInterval() {
  const currentSession = getCurrentSession()
  if (!currentSession) {
    console.error('No existing session found')
    return
  }

  const nextInterval = getNextInterval(currentSession.interval)
  return createSession(nextInterval.name)
}

function stop() {
  cache.remove(SESSION_CACHE_KEY)
}

export default {
  get: getCurrentSession,
  start: startNewSession,
  next: startNextInterval,
  stop,
  getTimeRemaining: getTimeRemainingMessage,
}
