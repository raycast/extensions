import { runFloatyCommand } from './run-floaty-command'

export default async function Command() {
  await runFloatyCommand({
    script: 'tell application "Floaty" to select window to pin',
    successMessage: 'Started Floaty window selection',
  })
}
