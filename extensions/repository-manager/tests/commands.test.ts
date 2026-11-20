import assert from 'node:assert/strict'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { CommandError, runCommand } from '../src/commands'
import { getCommandEnvironment } from '../src/platform'

async function fixture(t: { after: (cleanup: () => Promise<void>) => void }) {
    const root = await mkdtemp(path.join(tmpdir(), 'repository-manager-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const cwd = path.join(root, "O'Brien & Ω projects")
    await mkdir(cwd)
    return realpath(cwd)
}

test('native commands preserve arguments and UTF-8 output', async (t) => {
    const cwd = await fixture(t)
    const args = ['space here', "O'Brien", '"quotes"', '&|<>^%!; $value', 'Ω']
    const result = await runCommand(process.execPath, ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', '--', ...args], { cwd })
    assert.deepEqual(JSON.parse(result.stdout), args)
})

test('nonzero exits retain stdout and stderr', async (t) => {
    const cwd = await fixture(t)
    await assert.rejects(runCommand(process.execPath, ['-e', "process.stdout.write('before failure'); process.stderr.write('fixture failed'); process.exit(7)"], { cwd }), (error: unknown) => {
        assert.ok(error instanceof CommandError)
        assert.equal(error.stdout, 'before failure')
        assert.equal(error.stderr, 'fixture failed')
        return true
    })
})

test('missing executables provide installation guidance', async (t) => {
    const cwd = await fixture(t)
    await assert.rejects(runCommand('repository-manager-missing-command-783491', [], { cwd }), /was not found.*PATH/)
})

test('timeouts stop commands', async (t) => {
    const cwd = await fixture(t)
    await assert.rejects(runCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd, timeout: 100 }), /timed out/)
})

test('cancellation aborts commands', async (t) => {
    const cwd = await fixture(t)
    const controller = new AbortController()
    const result = runCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd, signal: controller.signal })
    controller.abort()
    await assert.rejects(result, (error: unknown) => error instanceof Error && error.name === 'AbortError')
})

test('output limits stop commands', async (t) => {
    const cwd = await fixture(t)
    await assert.rejects(runCommand(process.execPath, ['-e', "process.stdout.write('x'.repeat(10000))"], { cwd, maxBuffer: 100 }), /output exceeded/)
})

test('Git operations work in a repository path with spaces and special characters', async (t) => {
    const cwd = await fixture(t)
    await runCommand('git', ['init', '--initial-branch=main'], { cwd })
    await runCommand('git', ['config', 'user.name', 'Repository Manager Test'], { cwd })
    await runCommand('git', ['config', 'user.email', 'test@example.com'], { cwd })
    await writeFile(path.join(cwd, 'README.md'), 'fixture\n')
    await runCommand('git', ['add', '.'], { cwd })
    await runCommand('git', ['commit', '-m', 'Initial fixture'], { cwd })
    assert.equal((await runCommand('git', ['rev-list', '--all', '--count'], { cwd })).stdout.trim(), '1')
    assert.equal((await runCommand('git', ['status', '--porcelain=v2', '--branch'], { cwd })).stdout.includes('# branch.head main'), true)
    await writeFile(path.join(cwd, 'README.md'), 'modified\n')
    assert.match((await runCommand('git', ['status', '--porcelain'], { cwd })).stdout, /README.md/)
})

const runners = process.env.REPOSITORY_MANAGER_TEST_ALL_RUNNERS === '1' ? ['npm', 'pnpm', 'yarn', 'bun'] : ['npm']
for (const runner of runners) {
    test(`${runner} runs package scripts, including Windows .cmd shims`, async (t) => {
        const cwd = await fixture(t)
        const scriptNames = ['fixture', 'fixture space', 'fixture"quote', 'fixture&literal', 'fixture%literal']
        const scripts = Object.fromEntries(scriptNames.map((name) => [name, 'node fixture.cjs']))
        await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ name: 'repository-manager-fixture', version: '1.0.0', scripts }))
        await writeFile(path.join(cwd, 'fixture.cjs'), 'process.stdout.write(JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }))')
        for (const name of scriptNames) {
            const result = await runCommand(runner, ['run', name, 'hello world'], { cwd, timeout: 30000 })
            assert.ok(result.stdout.includes(JSON.stringify({ cwd, args: ['hello world'] })), result.stdout)
        }
    })
}

test('missing optional tokei is isolated from Git statistics', async (t) => {
    const cwd = await fixture(t)
    const env = getCommandEnvironment()
    env.PATH = cwd
    await assert.rejects(runCommand('tokei', ['--version'], { cwd, env }), /was not found/)
    assert.match((await runCommand('git', ['--version'], { cwd })).stdout, /git version/)
})

test('installed tokei reports its version and generates statistics', { skip: process.env.REPOSITORY_MANAGER_TEST_TOKEI !== '1' }, async (t) => {
    const cwd = await fixture(t)
    await writeFile(path.join(cwd, 'fixture.ts'), 'const answer = 42\n')
    assert.match((await runCommand('tokei', ['--version'], { cwd })).stdout, /tokei/)
    assert.match((await runCommand('tokei', ['.', '--compact'], { cwd })).stdout, /TypeScript/)
})
