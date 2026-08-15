import { execSync } from "child_process"
import { mkdirSync, writeFileSync } from "fs"

const TMP_SCRIPT = "/tmp/claude-sessions-open.scpt"

const shellEscape = (s: string) => s.replace(/'/g, "'\\''")

const runAppleScript = (script: string) => {
  writeFileSync(TMP_SCRIPT, script)
  execSync(`osascript "${TMP_SCRIPT}"`)
}

const iTermScript = (cmd: string) => `
tell application "iTerm"
  activate
  if (count of windows) > 0 then
    tell current window
      create tab with default profile
      tell current session of current tab
        write text "${cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"
      end tell
    end tell
  else
    create window with default profile
    tell current session of current window
      write text "${cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"
    end tell
  end if
end tell
`

const terminalScript = (cmd: string) => `
tell application "Terminal"
  do script "${cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"
  activate
end tell
`

export const openSession = (
  dir: string,
  isNew: boolean,
  terminalApp: string,
): void => {
  mkdirSync(dir, { recursive: true })
  const claudeCmd = isNew ? "claude" : "claude --continue"
  const cmd = `cd '${shellEscape(dir)}' && ${claudeCmd}`

  if (terminalApp === "iTerm") {
    runAppleScript(iTermScript(cmd))
    return
  }

  if (terminalApp === "Terminal") {
    runAppleScript(terminalScript(cmd))
    return
  }

  if (terminalApp === "Ghostty") {
    execSync(`open -na Ghostty --args --command='${shellEscape(cmd)}'`)
    return
  }

  if (terminalApp === "Warp") {
    execSync(`open -a Warp "${dir}"`)
  }
}
