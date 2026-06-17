import { runFloatyCommand } from './run-floaty-command'

export default async function Command() {
  await runFloatyCommand({
    script: 'tell application "Floaty" to show main window',
    successMessage: 'Opened Floaty main window',
  })
}
