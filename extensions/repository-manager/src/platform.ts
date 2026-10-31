import type { Application, Keyboard } from '@raycast/api'
import { homedir } from 'os'
import path from 'path'

function nativePath(platform: NodeJS.Platform) {
    return platform === 'win32' ? path.win32 : path.posix
}

export function resolveUserPath(filePath: string, platform = process.platform, home = homedir()): string {
    const paths = nativePath(platform)
    const expanded = /^~(?=$|[\\/])/.test(filePath) ? paths.join(home, filePath.slice(1).replace(/^[\\/]+/, '')) : filePath
    return paths.normalize(expanded)
}

export function getDisplayPath(fullPath: string, platform = process.platform, home = homedir()): string {
    const paths = nativePath(platform)
    const relative = paths.relative(home, fullPath)
    if (!relative) return '~'
    if (paths.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${paths.sep}`)) return paths.normalize(fullPath)
    return paths.join('~', relative)
}

export function getCommandEnvironment(env: NodeJS.ProcessEnv = process.env, platform = process.platform, home = homedir()): NodeJS.ProcessEnv {
    const paths = nativePath(platform)
    const result = { ...env }
    const pathKeys = Object.keys(env).filter((key) => (platform === 'win32' ? key.toLowerCase() === 'path' : key === 'PATH'))
    const inheritedPath = env.PATH ?? pathKeys.map((key) => env[key]).find((value) => value !== undefined) ?? ''
    for (const key of pathKeys) delete result[key]

    const entries = inheritedPath.split(paths.delimiter).filter(Boolean)
    entries.push(paths.join(env.CARGO_HOME || paths.join(home, '.cargo'), 'bin'))
    if (platform === 'darwin') entries.push('/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin')

    const seen = new Set<string>()
    result.PATH = entries
        .filter((entry) => {
            const key = platform === 'win32' ? entry.toLowerCase() : entry
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
        .join(paths.delimiter)
    return result
}

export const commandEnvironment = getCommandEnvironment()

export function projectShortcut(key: Keyboard.KeyEquivalent, modifiers: ('shift' | 'opt')[] = []): Keyboard.Shortcut {
    return {
        macOS: { modifiers: ['cmd', ...modifiers], key },
        Windows: { modifiers: ['ctrl', ...modifiers.map((modifier) => (modifier === 'opt' ? ('alt' as const) : modifier))], key },
    }
}

export const revealProjectTitle = process.platform === 'win32' ? 'Show in File Explorer' : 'Show in Finder'

export function shouldResizeEditorWindow(enabled: boolean | undefined, app: Pick<Application, 'name'> | undefined, platform = process.platform): boolean {
    return platform === 'darwin' && Boolean(enabled) && Boolean(app?.name)
}

export function quotePowerShellLiteral(value: string): string {
    return `'${value.replace(/'/g, "''")}'`
}

type TerminalLaunch = { command: string; args: string[] } | { script: string }

export function getWindowsTerminalLaunch(app: Application, projectPath: string): TerminalLaunch {
    const executable = path.win32.basename(app.path).toLowerCase()
    if (['wt.exe', 'windowsterminal.exe'].includes(executable) || /Microsoft\.WindowsTerminal/i.test(app.windowsAppId || '') || /^Windows Terminal$/i.test(app.name)) {
        return { command: ['wt.exe', 'windowsterminal.exe'].includes(executable) ? app.path : 'wt.exe', args: ['new-tab', '--startingDirectory', projectPath] }
    }

    const isPowerShell = ['powershell.exe', 'pwsh.exe'].includes(executable) || /^(Windows )?PowerShell(?: \d+(?:\.\d+)*)?$/i.test(app.name)
    const isCommandPrompt = executable === 'cmd.exe' || /^Command Prompt$/i.test(app.name)
    if (!isPowerShell && !isCommandPrompt) {
        throw new Error('Choose Windows Terminal, Windows PowerShell, PowerShell 7, or Command Prompt in extension preferences')
    }

    const args = isPowerShell ? " -ArgumentList '-NoLogo', '-NoExit'" : ''
    return { script: `$ErrorActionPreference = 'Stop'; Start-Process -FilePath ${quotePowerShellLiteral(app.path)} -WorkingDirectory ${quotePowerShellLiteral(projectPath)}${args}` }
}
