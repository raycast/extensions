import { Application, open } from '@raycast/api'
import { runPowerShellScript } from '@raycast/utils'
import { getWindowsTerminalLaunch } from './platform'
import { runCommand } from './commands'
import { preferences, resizeEditorWindow } from './helpers'

export async function openProjectInEditor(projectPath: string): Promise<void> {
    if (!preferences.editorApp?.path) throw new Error('Please configure your preferred editor in extension preferences')
    await open(projectPath, preferences.editorApp)
    await resizeEditorWindow(preferences.editorApp)
}

export async function openProjectInTerminal(projectPath: string): Promise<void> {
    const app: Application | undefined = preferences.terminalApp
    if (!app?.path) throw new Error('Please configure your preferred terminal in extension preferences')
    if (process.platform !== 'win32') {
        await open(projectPath, app)
        return
    }

    const launch = getWindowsTerminalLaunch(app, projectPath)
    if ('script' in launch) await runPowerShellScript(launch.script)
    else await runCommand(launch.command, launch.args, { cwd: projectPath })
}
