import { Icon, LaunchProps, MenuBarExtra, showHUD } from '@raycast/api'
import { useEffect, useState } from 'react'
import { Session, Audio, INTERVALS, type CurrentSession } from '../utils'

function executeBackgroundProcess() {
  const session = Session.get()
  const isMuted = Audio.isMuted()
  const currentTime = new Date().getTime()

  if (session) {
    const timeRemainingMs = session.endTime - currentTime

    if (timeRemainingMs <= 0) {
      handleOnIntervalEnd({ isMuted, session })
    }
  }
}

function handleOnIntervalEnd({ isMuted, session }: { isMuted: boolean; session: CurrentSession }) {
  if (!isMuted) {
    const intervalName = session.interval
    const audioFileName = INTERVALS[intervalName].audioFileName
    Audio.play(audioFileName)
  }

  const nextInterval = Session.next()

  if (nextInterval && INTERVALS[nextInterval.interval].name === 'no-screen') {
    showHUD('Time to look away 🫣')
  }
  return nextInterval
}

function MenuBarMute() {
  const isMuted = Audio.isMuted()

  const icon = isMuted ? Icon.Bell : Icon.BellDisabled
  const title = isMuted ? 'Unmute notification' : 'Mute notification'

  function handleOnAction() {
    Audio.toggleMute(isMuted)
  }
  return <MenuBarExtra.Item icon={icon} title={title} onAction={handleOnAction} />
}

export default function Command({ launchContext }: LaunchProps<{ launchContext: { autoStartNewSession: boolean } }>) {
  const [timeRemainingMessage, setTimeRemainingMessage] = useState('Calculating time remaining...')
  const currentSession = Session.get()
  const isMuted = Audio.isMuted()

  useEffect(() => {
    if (launchContext?.autoStartNewSession) {
      Session.start()
    }
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const session = Session.get()
      const currentTime = new Date().getTime()

      if (!session) {
        return
      }

      const timeRemainingMs = session.endTime - currentTime

      if (timeRemainingMs <= 0) {
        const nextInterval = handleOnIntervalEnd({ isMuted, session })
        const message = nextInterval
          ? Session.getTimeRemaining(INTERVALS[nextInterval.interval].duration)
          : 'Starting next interval 💪'

        setTimeRemainingMessage(message)
      } else {
        const message = Session.getTimeRemaining(timeRemainingMs)
        setTimeRemainingMessage(message)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  executeBackgroundProcess()

  function handleOnStop() {
    Session.stop()
  }

  function handleOnStart() {
    Session.start()
  }

  return (
    <MenuBarExtra icon={Icon.Eye}>
      {currentSession ? (
        <>
          <MenuBarExtra.Item title={timeRemainingMessage} />
          <MenuBarExtra.Item icon={Icon.Stop} title="Stop session" onAction={handleOnStop} />
          <MenuBarMute />
        </>
      ) : (
        <MenuBarExtra.Item icon={Icon.Play} title="Start session" onAction={handleOnStart} />
      )}
    </MenuBarExtra>
  )
}
