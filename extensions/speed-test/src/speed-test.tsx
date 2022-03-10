import markdownContent from './content'
import errorMarkdownContent from './error'
import { spawn } from 'node:child_process'
import { useEffect, useState } from 'react'
import { Action, ActionPanel, Detail, Toast, getPreferenceValues } from '@raycast/api'
import {
  ISpeedLog,
  ISpeedTestBasic,
  ISpeedTestPing,
  ISpeedTestResult,
  ISpeedTestStart,
  ISpeedTestUpload,
  SpeedTestDataType,
  ISpeedTestDownload,
} from './types'

let isSpeedTestRunning = false

export default function () {
  const [stateIsSpeedTesting, setStateIsSpeedTesting] = useState(false)
  const [stateSpeedTestStart, setStateSpeedTestStart] = useState<ISpeedTestStart>()
  const [stateSpeedTestPing, setStateSpeedTestPing] = useState<ISpeedTestPing>()
  const [stateSpeedTestDownload, setStateSpeedTestDownload] = useState<ISpeedTestDownload>()
  const [stateSpeedTestUpload, setStateSpeedTestUpload] = useState<ISpeedTestUpload>()
  const [stateSpeedTestResult, setStateSpeedTestResult] = useState<ISpeedTestResult>()

  const [stateSpeedTestMarkdownContent, setStateSpeedTestMarkdownContent] = useState<string>('')
  const [stateMarkdownErrorContent, setStateMarkdownErrorContent] = useState<string>('')

  const SpeedTestInstallPath = getPreferenceValues().SpeedTestInstallPath

  function stdout(data: ISpeedTestBasic) {
    const updateDataMap = {
      [SpeedTestDataType.testStart]() {
        setStateSpeedTestStart(data as ISpeedTestStart)
      },
      [SpeedTestDataType.Ping]() {
        setStateSpeedTestPing(data as ISpeedTestPing)
      },
      [SpeedTestDataType.Download]() {
        setStateSpeedTestDownload(data as ISpeedTestDownload)
      },
      [SpeedTestDataType.Upload]() {
        setStateSpeedTestUpload(data as ISpeedTestUpload)
      },
      [SpeedTestDataType.result]() {
        setStateSpeedTestResult(data as ISpeedTestResult)
      },
    }

    updateDataMap[data.type]()
  }

  const watchList = [
    stateSpeedTestStart,
    stateSpeedTestPing,
    stateSpeedTestDownload,
    stateSpeedTestUpload,
    stateSpeedTestResult,
  ]

  useEffect(() => {
    setStateSpeedTestMarkdownContent(
      markdownContent(
        stateSpeedTestStart,
        stateSpeedTestPing,
        stateSpeedTestDownload,
        stateSpeedTestUpload,
        stateSpeedTestResult
      )
    )

    if (stateSpeedTestResult?.result.id) {
      setStateIsSpeedTesting(false)

      new Toast({
        title: 'Speed Test',
        message: 'Test Finished.',
        style: Toast.Style.Success,
      }).show()
    }
  }, watchList)

  function stderr(error: ISpeedLog) {
    // Error: [0] Timeout occurred in connect. code [0] is normal can ignore it
    if (error.message.indexOf('[0]') != -1) return

    new Toast({
      title: 'Error',
      message: 'Please check you network connection.',
      style: Toast.Style.Failure,
    }).show()
  }

  function runSpeedTest() {
    if (isSpeedTestRunning) return
    isSpeedTestRunning = true

    setStateIsSpeedTesting(true)

    const sp = spawn('speedtest', ['-f', 'jsonl'], { cwd: SpeedTestInstallPath, shell: true })
    sp.on('error', () => {
      setStateIsSpeedTesting(false)
      setStateMarkdownErrorContent(errorMarkdownContent())
    })

    sp.stdout.on('data', (data) => stdout(JSON.parse(data.toString())))
    sp.stderr.on('data', (data) => {
      try {
        stderr(JSON.parse(data.toString()))
      } catch (err) {
        console.log('Not JSON Format Error')
      }
    })
  }

  runSpeedTest()

  function DetailAction() {
    return (
      <ActionPanel>
        {stateSpeedTestResult?.result.url && (
          <Action.OpenInBrowser title="Result Details" url={stateSpeedTestResult?.result.url} />
        )}
        <Action.OpenInBrowser title="Help" url="https://github.com/haojen/raycast-speedtest" />
      </ActionPanel>
    )
  }

  return (
    <Detail
      actions={<DetailAction />}
      markdown={stateMarkdownErrorContent ? stateMarkdownErrorContent : stateSpeedTestMarkdownContent}
      isLoading={stateIsSpeedTesting}
    />
  )
}
