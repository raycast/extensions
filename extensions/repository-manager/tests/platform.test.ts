import assert from 'node:assert/strict'
import test from 'node:test'
import { getCommandEnvironment, getDisplayPath, getWindowsTerminalLaunch, projectShortcut, quotePowerShellLiteral, resolveUserPath, shouldResizeEditorWindow } from '../src/platform'

test('expands home paths using native separators', () => {
    for (const input of ['~', '~/dev', '~\\dev', '~/dev/../projects']) {
        const suffix = input === '~' ? '' : input.includes('..') ? '\\projects' : '\\dev'
        assert.equal(resolveUserPath(input, 'win32', 'C:\\Users\\Alex'), `C:\\Users\\Alex${suffix}`)
    }
    assert.equal(resolveUserPath('~\\dev', 'darwin', '/Users/alex'), '/Users/alex/dev')
    assert.equal(resolveUserPath('~other/dev', 'darwin', '/Users/alex'), '~other/dev')
})

test('normalizes drive and UNC paths without changing spaces or apostrophes', () => {
    assert.equal(resolveUserPath("D:/Projects/O'Brien & Ω/repo", 'win32'), "D:\\Projects\\O'Brien & Ω\\repo")
    assert.equal(resolveUserPath('\\\\server\\share\\projects\\..\\repo', 'win32'), '\\\\server\\share\\repo')
})

test('abbreviates home only at directory boundaries, including Windows casing', () => {
    assert.equal(getDisplayPath('c:\\users\\alex\\dev\\repo', 'win32', 'C:\\Users\\Alex'), '~\\dev\\repo')
    assert.equal(getDisplayPath('C:\\Users\\Alex', 'win32', 'C:\\Users\\Alex'), '~')
    assert.equal(getDisplayPath('C:\\Users\\Alexandra\\repo', 'win32', 'C:\\Users\\Alex'), 'C:\\Users\\Alexandra\\repo')
    assert.equal(getDisplayPath('D:\\repo', 'win32', 'C:\\Users\\Alex'), 'D:\\repo')
    assert.equal(getDisplayPath('/Users/alexandra/repo', 'darwin', '/Users/alex'), '/Users/alexandra/repo')
    assert.equal(getDisplayPath('/Users/alex/dev', 'darwin', '/Users/alex'), '~/dev')
})

test('preserves Windows Path and emits one case-insensitive PATH key', () => {
    const original = { Path: 'C:\\Git\\cmd;C:\\Tools', PATHEXT: '.COM;.EXE;.BAT;.CMD', OTHER: 'preserved' }
    const env = getCommandEnvironment(original, 'win32', 'C:\\Users\\Alex')
    assert.equal(env.PATH, 'C:\\Git\\cmd;C:\\Tools;C:\\Users\\Alex\\.cargo\\bin')
    assert.deepEqual(
        Object.keys(env).filter((key) => key.toLowerCase() === 'path'),
        ['PATH'],
    )
    assert.equal(env.PATHEXT, original.PATHEXT)
    assert.equal(env.OTHER, 'preserved')
    assert.equal(original.Path, 'C:\\Git\\cmd;C:\\Tools')
    assert.ok(!env.PATH?.includes('/usr/'))
})

test('deduplicates Windows paths and honors custom Cargo installations', () => {
    const env = getCommandEnvironment({ PATH: 'C:\\Tools;c:\\tools', Path: 'D:\\ignored', CARGO_HOME: 'D:\\Rust' }, 'win32', 'C:\\Users\\Alex')
    assert.equal(env.PATH, 'C:\\Tools;D:\\Rust\\bin')
    assert.equal(env.Path, undefined)
})

test('keeps inherited macOS tools before platform fallback paths', () => {
    const env = getCommandEnvironment({ PATH: '/custom/bin:/usr/bin' }, 'darwin', '/Users/alex')
    assert.equal(env.PATH, '/custom/bin:/usr/bin:/Users/alex/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:/bin:/usr/sbin:/sbin')
})

test('preserves macOS shortcuts and maps modifiers for Windows', () => {
    assert.deepEqual(projectShortcut('o', ['opt', 'shift']), {
        macOS: { modifiers: ['cmd', 'opt', 'shift'], key: 'o' },
        Windows: { modifiers: ['ctrl', 'alt', 'shift'], key: 'o' },
    })
})

test('window resizing is enabled only on macOS', () => {
    const app = { name: 'Visual Studio Code' }
    assert.equal(shouldResizeEditorWindow(true, app, 'win32'), false)
    assert.equal(shouldResizeEditorWindow(true, app, 'darwin'), true)
    assert.equal(shouldResizeEditorWindow(false, app, 'darwin'), false)
    assert.equal(shouldResizeEditorWindow(true, undefined, 'darwin'), false)
})

test('Windows Terminal receives the repository as a separate directory argument', () => {
    const repo = "D:\\Projects\\O'Brien & Ω; repo"
    const app = { name: 'Terminal', path: 'C:\\Apps\\Terminal.lnk', windowsAppId: 'Microsoft.WindowsTerminal_8wekyb3d8bbwe!App' }
    assert.deepEqual(getWindowsTerminalLaunch(app, repo), { command: 'wt.exe', args: ['new-tab', '--startingDirectory', repo] })
})

test('PowerShell and Command Prompt launches use a literal working directory', () => {
    const repo = "C:\\Projects\\O'Brien & $value; repo"
    for (const name of ['Windows PowerShell', 'PowerShell 7', 'Command Prompt']) {
        const result = getWindowsTerminalLaunch({ name, path: `C:\\Apps\\${name}.lnk` }, repo)
        assert.ok('script' in result)
        assert.ok(result.script.includes("-WorkingDirectory 'C:\\Projects\\O''Brien & $value; repo'"))
        assert.equal(result.script.includes("'-NoExit'"), name !== 'Command Prompt')
    }
    assert.equal(quotePowerShellLiteral("O'Brien"), "'O''Brien'")
})

test('unsupported Windows terminals provide configuration guidance', () => {
    assert.throws(() => getWindowsTerminalLaunch({ name: 'Other Terminal', path: 'C:\\Apps\\other.exe' }, 'C:\\repo'), /Choose Windows Terminal/)
})
