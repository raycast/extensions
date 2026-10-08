import { runFloatyCommand } from './run-floaty-command'

export default async function Command() {
  await runFloatyCommand({
    script: 'tell application "Floaty" to unpin or restore all windows',
    successMessage: 'Toggled all Floaty pinned windows',
  })
}
