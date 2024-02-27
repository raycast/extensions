import { MIN_IN_MS } from './constants'
import type { Interval, IntervalName } from './types'

export const INTERVALS: { [key: string]: Interval } = {
  screen: {
    name: 'screen' as const,
    duration: 20 * MIN_IN_MS, // 20 minutes
    audioFileName: 'attention.wav',
  },
  'no-screen': {
    name: 'no-screen' as const,
    duration: 20 * 1000, // 20 seconds
    audioFileName: 'achieve.wav',
  },
}

export function getNextInterval(currentInterval: IntervalName): Interval {
  switch (currentInterval) {
    case 'screen':
      return INTERVALS['no-screen']
    case 'no-screen':
      return INTERVALS['screen']
    default:
      throw Error('Unrecognized interval name')
  }
}
