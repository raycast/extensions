export type IntervalName = 'screen' | 'no-screen'
type DurationInMs = number

export type Interval = {
  name: IntervalName
  duration: DurationInMs
  audioFileName: string
}

export type CurrentSession = {
  endTime: number
  interval: IntervalName
}

export type AudioSettings = {
  isMuted: boolean
}
