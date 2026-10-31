import spawn from 'cross-spawn'
import { getCommandEnvironment } from './platform'

type CommandOptions = {
    cwd: string
    signal?: AbortSignal
    timeout?: number
    env?: NodeJS.ProcessEnv
    maxBuffer?: number
}

export class CommandError extends Error {
    constructor(
        message: string,
        readonly stdout: string,
        readonly stderr: string,
    ) {
        super(message)
        this.name = 'CommandError'
    }
}

export function runCommand(command: string, args: string[], { cwd, signal, timeout = 10000, env = getCommandEnvironment(), maxBuffer = 10 * 1024 * 1024 }: CommandOptions): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd, signal, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
        const stdout: Buffer[] = []
        const stderr: Buffer[] = []
        let outputSize = 0
        let settled = false
        let failure: string | undefined
        let timer: ReturnType<typeof setTimeout> | undefined

        const finish = (error?: Error) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            const output = { stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') }
            if (error || failure) reject(error || new CommandError(failure as string, output.stdout, output.stderr))
            else resolve(output)
        }

        const collect = (chunks: Buffer[]) => (chunk: Buffer) => {
            outputSize += chunk.length
            if (outputSize > maxBuffer) {
                failure = `${command} output exceeded ${maxBuffer} bytes`
                child.kill()
            } else {
                chunks.push(chunk)
            }
        }
        child.stdout?.on('data', collect(stdout))
        child.stderr?.on('data', collect(stderr))
        child.on('error', (error: NodeJS.ErrnoException) => {
            finish(error.code === 'ENOENT' ? new Error(`${command} was not found. Install it and make sure it is available on PATH.`) : error)
        })
        child.on('close', (code, terminationSignal) => {
            if (!failure && code !== 0) {
                failure = Buffer.concat(stderr).toString('utf8').trim() || `${command} exited with ${terminationSignal || `code ${code}`}`
            }
            finish()
        })
        if (timeout > 0)
            timer = setTimeout(() => {
                failure = `${command} timed out after ${timeout} ms`
                child.kill()
            }, timeout)
    })
}
