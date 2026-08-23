import { Action, ActionPanel, AI, Detail, Icon, environment, useNavigation } from '@raycast/api'
import { useAI, usePromise } from '@raycast/utils'
import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { Project } from '../project'
import { OpenInEditor, OpenInTerminal } from './Open'

type AIRepoBriefProps = {
    project: Project
}

type GitResult = {
    stdout: string
    stderr: string
    error: string | null
}

type UntrackedFileContent = {
    filePath: string
    content: string
}

type UntrackedFilesResult = {
    contents: UntrackedFileContent[]
    skipped: string[]
}

type PromptContext = {
    prompt: string
    context: string
    omitted: string[]
}

const execFileAsync = promisify(execFile)
const MAX_AI_CONTEXT_BYTES = 300_000

async function runGit(project: Project, args: string[]): Promise<GitResult> {
    try {
        const { stdout, stderr } = await execFileAsync('git', args, { cwd: project.fullPath, maxBuffer: 1024 * 1024 * 50 })

        return {
            stdout,
            stderr,
            error: null,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Git command failed'
        const gitError = error as { stdout?: string; stderr?: string }

        return {
            stdout: gitError.stdout || '',
            stderr: gitError.stderr || '',
            error: message,
        }
    }
}

function bytes(value: string): number {
    return Buffer.byteLength(value, 'utf8')
}

function truncateUtf8(value: string, maxBytes: number): string {
    if (maxBytes <= 0) {
        return ''
    }

    return Buffer.from(value, 'utf8').subarray(0, maxBytes).toString('utf8')
}

class ContextAccumulator {
    private sections: string[] = []
    private currentBytes = 0
    readonly omitted: string[] = []

    appendSection(title: string, content: string, allowTruncation = true): void {
        const normalizedContent = content.trim() || 'No output'
        const section = `## ${title}\n\n${normalizedContent}\n`
        const sectionBytes = bytes(section)
        const remainingBytes = MAX_AI_CONTEXT_BYTES - this.currentBytes

        if (sectionBytes <= remainingBytes) {
            this.sections.push(section)
            this.currentBytes += sectionBytes
            return
        }

        if (!allowTruncation || remainingBytes <= 128) {
            this.omitted.push(title)
            return
        }

        const header = `## ${title}\n\n`
        const suffix = '\n\n[Content truncated because the AI context cap was reached.]\n'
        const contentBudget = remainingBytes - bytes(header) - bytes(suffix)

        if (contentBudget <= 0) {
            this.omitted.push(title)
            return
        }

        this.sections.push(`${header}${truncateUtf8(normalizedContent, contentBudget)}${suffix}`)
        this.currentBytes = MAX_AI_CONTEXT_BYTES
        this.omitted.push(`${title} (truncated)`)
    }

    toString(): string {
        return this.sections.join('\n')
    }
}

function formatGitResult(result: GitResult): string {
    const parts = []

    if (result.stdout.trim()) {
        parts.push(result.stdout.trim())
    }

    if (result.stderr.trim()) {
        parts.push(`stderr:\n${result.stderr.trim()}`)
    }

    if (result.error) {
        parts.push(`error:\n${result.error}`)
    }

    return parts.join('\n\n') || 'No output'
}

async function getTrackedDiff(project: Project): Promise<string> {
    const headDiff = await runGit(project, ['diff', 'HEAD', '--'])

    if (!headDiff.error) {
        return formatGitResult(headDiff)
    }

    const fallbackDiff = await runGit(project, ['diff', '--'])
    return formatGitResult(fallbackDiff)
}

async function getUntrackedFiles(project: Project): Promise<UntrackedFilesResult> {
    const result = await runGit(project, ['ls-files', '--others', '--exclude-standard', '-z'])
    const files = result.stdout.split('\0').filter(Boolean)
    const contents: UntrackedFileContent[] = []
    const skipped: string[] = []

    for (const filePath of files) {
        const absolutePath = path.join(project.fullPath, filePath)

        try {
            const stat = await fs.stat(absolutePath)

            if (!stat.isFile()) {
                skipped.push(`${filePath} (not a file)`)
                continue
            }

            const buffer = stat.size > MAX_AI_CONTEXT_BYTES ? await readFileStart(absolutePath, MAX_AI_CONTEXT_BYTES) : await fs.readFile(absolutePath)

            if (buffer.includes(0)) {
                skipped.push(`${filePath} (binary)`)
                continue
            }

            contents.push({
                filePath,
                content: stat.size > MAX_AI_CONTEXT_BYTES ? `${buffer.toString('utf8')}\n\n[File read truncated before applying the AI context cap.]` : buffer.toString('utf8'),
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'unreadable'
            skipped.push(`${filePath} (${message})`)
        }
    }

    return { contents, skipped }
}

async function readFileStart(filePath: string, maxBytes: number): Promise<Buffer> {
    const fileHandle = await fs.open(filePath, 'r')

    try {
        const buffer = Buffer.alloc(maxBytes)
        const { bytesRead } = await fileHandle.read(buffer, 0, maxBytes, 0)
        return buffer.subarray(0, bytesRead)
    } finally {
        await fileHandle.close()
    }
}

function getRepositoryMetadata(project: Project): string {
    const remotes = project.gitRemotes.length > 0 ? project.gitRemotes.map((remote) => `- ${remote.name}: ${remote.url}`).join('\n') : 'No remotes detected'
    const urls =
        project.config.urls && Object.keys(project.config.urls).length > 0
            ? Object.entries(project.config.urls)
                  .map(([key, value]) => `- ${key}: ${value}`)
                  .join('\n')
            : 'No project URLs configured'
    const tags = project.tags.length > 0 ? project.tags.join(', ') : 'No tags assigned'

    return `
Name: ${project.name}
Path: ${project.displayPath}
Description: ${project.description || 'No description'}
Primary directory: ${project.primaryDirectory.name}
Tags: ${tags}

Remotes:
${remotes}

Project URLs:
${urls}
`
}

export async function buildAIRepoBriefPrompt(project: Project): Promise<PromptContext> {
    const [status, recentCommits, trackedDiff, untrackedFiles] = await Promise.all([runGit(project, ['status', '--porcelain=v2', '--branch']), runGit(project, ['log', '--decorate=short', '--pretty=format:%h %ad %an %d%n%s', '--date=short', '-20']), getTrackedDiff(project), getUntrackedFiles(project)])
    const context = new ContextAccumulator()

    context.appendSection('Repository Metadata', getRepositoryMetadata(project), false)
    context.appendSection('Git Status', formatGitResult(status), false)
    context.appendSection('Recent Commits', formatGitResult(recentCommits))

    if (untrackedFiles.skipped.length > 0) {
        context.appendSection('Skipped Untracked Files', untrackedFiles.skipped.map((filePath) => `- ${filePath}`).join('\n'))
    }

    context.appendSection('Tracked Diff', trackedDiff)

    for (const untrackedFile of untrackedFiles.contents) {
        context.appendSection(`Untracked File: ${untrackedFile.filePath}`, untrackedFile.content)
    }

    const contextMarkdown = context.toString()
    const omitted = context.omitted
    const omissionNote = omitted.length > 0 ? `Some repository content was omitted because the context reached the ${MAX_AI_CONTEXT_BYTES.toLocaleString()} byte cap:\n${omitted.map((item) => `- ${item}`).join('\n')}` : `No content was omitted by the ${MAX_AI_CONTEXT_BYTES.toLocaleString()} byte cap.`

    const prompt = `
You are generating a concise, practical repository brief for the developer who owns this local Git repository.

Use only the context below. Be specific about the current branch state, local changes, recent activity, and anything that likely needs attention. Mention skipped or omitted content when it affects confidence.

Return Markdown with these sections:
# Repo Brief
## Snapshot
## Current Changes
## Recent Activity
## Needs Attention

${omissionNote}

<repository-context>
${contextMarkdown}
</repository-context>
`

    return {
        prompt,
        context: contextMarkdown,
        omitted,
    }
}

export default function AIRepoBriefDetail({ project }: AIRepoBriefProps) {
    const canAccessAI = environment.canAccess(AI)
    const {
        isLoading: isLoadingPrompt,
        data: promptContext,
        error: promptError,
        revalidate: rebuildPrompt,
    } = usePromise(buildAIRepoBriefPrompt, [project], {
        execute: canAccessAI,
        failureToastOptions: {
            title: 'Failed to Build AI Context',
        },
    })
    const prompt = promptContext?.prompt || ''
    const {
        isLoading: isGenerating,
        data: brief,
        error: aiError,
        revalidate: regenerateBrief,
    } = useAI(prompt, {
        creativity: 'low',
        stream: true,
        execute: canAccessAI && Boolean(prompt),
    })

    const markdown = !canAccessAI ? '# AI Repo Brief\n\nRaycast AI is not available for this account or environment.' : promptError ? `# AI Repo Brief\n\nFailed to build repository context.\n\n\`\`\`\n${promptError.message}\n\`\`\`` : aiError ? `# AI Repo Brief\n\nFailed to generate the brief.\n\n\`\`\`\n${aiError.message}\n\`\`\`` : brief || '# AI Repo Brief\n\nPreparing repository context...'

    return (
        <Detail
            navigationTitle={`${project.name} AI Brief`}
            isLoading={isLoadingPrompt || isGenerating}
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action
                        title="Regenerate Brief"
                        icon={Icon.ArrowClockwise}
                        onAction={() => {
                            if (prompt) {
                                regenerateBrief()
                            } else {
                                rebuildPrompt()
                            }
                        }}
                    />
                    <Action.CopyToClipboard
                        title="Copy Brief"
                        content={brief || ''}
                        icon={Icon.Clipboard}
                    />
                    <Action.CopyToClipboard
                        title="Copy Prompt Context"
                        content={promptContext?.context || prompt}
                        icon={Icon.Text}
                    />
                    <OpenInEditor project={project} />
                    <OpenInTerminal project={project} />
                </ActionPanel>
            }
        />
    )
}

export function GenerateAIRepoBriefAction({ project }: AIRepoBriefProps) {
    const { push } = useNavigation()

    return (
        <Action
            title="Generate AI Repo Brief"
            icon={Icon.Stars}
            onAction={() => push(<AIRepoBriefDetail project={project} />)}
        />
    )
}
