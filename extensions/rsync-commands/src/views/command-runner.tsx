import { FC, useEffect, useState } from "react"
import { Action, ActionPanel, Detail, showToast, Toast, useNavigation } from "@raycast/api"
import useSystem from "../hooks/use-system"

const inProgressMessage = "Synchronizing files..."
const successMessage = "Files synchronized successfully"
const errorMessage = "Failed synchronizing files"

type ResultProps = {
  command: string
}

const CommandRunner: FC<ResultProps> = ({ command }) => {
  const [runCount, setRunCount] = useState<number>(0)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [processOut, setProcessOut] = useState<string>("")
  const [processExit, setProcessExit] = useState<number | undefined>()

  const { pop } = useNavigation()
  const { exec } = useSystem()

  const commandFinished = processExit !== undefined
  const commandSucceeded = commandFinished && processExit === 0
  const retryText = retryCount > 0 ? ` (retry #${retryCount})` : ""
  const outputHeader = !commandFinished
    ? `# ${inProgressMessage}${retryText}`
    : commandSucceeded
    ? `# ${successMessage} ⚡`
    : `# ${errorMessage}${retryText} 💥`
  const output = `${outputHeader}\n
  \n\`\`\`${processOut}\`\`\``

  useEffect(
    function () {
      const process = exec(command)

      const onStdOutData = (data: string) => {
        setProcessOut(prev => `${prev}\n${data}`)
      }
      const onStdErrData = (data: string) => {
        setProcessOut(prev => `${prev}\n${data}`)
      }
      const onExit = (code: number) => {
        setProcessExit(code)
        process.stdout?.off("data", onStdOutData)
        process.stderr?.off("data", onStdErrData)
        process.off("exit", onExit)
      }

      process.stdout?.on("data", onStdOutData)
      process.stderr?.on("data", onStdErrData)
      process.on("exit", onExit)
    },
    [command, exec, runCount]
  )

  const retry = () => {
    setRetryCount(prev => (commandSucceeded ? 0 : prev + 1))
    setRunCount(prev => prev + 1)
    setProcessExit(undefined)
    setProcessOut("")
  }

  useEffect(
    function () {
      const doShowToast = async () => {
        await showToast({
          style: commandSucceeded ? Toast.Style.Success : Toast.Style.Failure,
          title: commandSucceeded ? successMessage : errorMessage,
        })
      }
      if (processExit !== undefined) doShowToast()
    },
    [processExit, commandSucceeded]
  )

  const retryComponent = <Action title={commandSucceeded ? "Go again" : "Retry"} onAction={() => retry()} />
  return (
    <Detail
      isLoading={!commandFinished}
      markdown={output}
      actions={
        <ActionPanel>
          {commandFinished && !commandSucceeded && retryComponent}
          {commandFinished && (
            <>
              <Action title="Done" onAction={() => pop()} />
            </>
          )}
          {commandFinished && commandSucceeded && retryComponent}
        </ActionPanel>
      }
    />
  )
}

export default CommandRunner
