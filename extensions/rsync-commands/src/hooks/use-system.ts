import { ChildProcess, exec as nodeExec } from "child_process"
import { useCallback } from "react"

export type DoExecResult = {
  success: boolean
  result: string
}

type UseSystemOutput = {
  execSync: (command: string) => Promise<DoExecResult>
  exec: (command: string) => ChildProcess
}

const useSystem = (): UseSystemOutput => {
  const execSync = useCallback((command: string) => {
    return new Promise<DoExecResult>(resolve => {
      nodeExec(command, (error, stdout) => {
        if (error) {
          resolve({
            success: false,
            result: error.message,
          })
        } else {
          resolve({
            success: true,
            result: stdout,
          })
        }
      })
    })
  }, [])

  const exec = useCallback((command: string) => {
    return nodeExec(command)
  }, [])

  return { execSync, exec }
}

export default useSystem
