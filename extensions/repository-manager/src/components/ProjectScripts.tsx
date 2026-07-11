import { Action, ActionPanel, Detail, Icon, List } from '@raycast/api'
import { useExec } from '@raycast/utils'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { Project } from '../project'
import { OpenInEditor, OpenInTerminal } from './Open'

type ProjectScriptsProps = {
    project: Project
}

type ProjectScript = {
    title: string
    command: string
    args: string[]
    source: string
}

type ScriptRunnerDetailProps = {
    project: Project
    script: ProjectScript
}

function isString(value: string | undefined): value is string {
    return typeof value === 'string'
}

function detectPackageManager(projectPath: string): string {
    if (existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm'
    if (existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn'
    if (existsSync(path.join(projectPath, 'bun.lockb')) || existsSync(path.join(projectPath, 'bun.lock'))) return 'bun'
    return 'npm'
}

function getPackageScripts(project: Project): ProjectScript[] {
    const packageJsonPath = path.join(project.fullPath, 'package.json')

    if (!existsSync(packageJsonPath)) {
        return []
    }

    try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { scripts?: Record<string, string> }
        const packageManager = detectPackageManager(project.fullPath)

        return Object.entries(packageJson.scripts || {}).map(([scriptName]) => ({
            title: scriptName,
            command: packageManager,
            args: ['run', scriptName],
            source: 'package.json',
        }))
    } catch (error) {
        console.error(`Failed to parse package.json for ${project.fullPath}:`, error)
        return []
    }
}

function getMakeTargets(project: Project): ProjectScript[] {
    const makefilePath = path.join(project.fullPath, 'Makefile')

    if (!existsSync(makefilePath)) {
        return []
    }

    return readFileSync(makefilePath, 'utf8')
        .split('\n')
        .map((line) => line.match(/^([A-Za-z0-9_.-]+):(?:\s|$)/)?.[1])
        .filter(isString)
        .filter((target) => !target.startsWith('.'))
        .filter((target, index, targets) => targets.indexOf(target) === index)
        .map((target) => ({
            title: target,
            command: 'make',
            args: [target],
            source: 'Makefile',
        }))
}

function getJustTargets(project: Project): ProjectScript[] {
    const justfilePath = ['justfile', 'Justfile'].map((filename) => path.join(project.fullPath, filename)).find((filePath) => existsSync(filePath))

    if (!justfilePath) {
        return []
    }

    return readFileSync(justfilePath, 'utf8')
        .split('\n')
        .map((line) => line.match(/^([A-Za-z0-9_.-]+)(?:\s|:|$)/)?.[1])
        .filter(isString)
        .filter((target) => !target.startsWith('#') && !target.startsWith('_') && target !== 'set')
        .filter((target, index, targets) => targets.indexOf(target) === index)
        .map((target) => ({
            title: target,
            command: 'just',
            args: [target],
            source: path.basename(justfilePath),
        }))
}

function getTaskfileTargets(project: Project): ProjectScript[] {
    const taskfilePath = ['Taskfile.yml', 'Taskfile.yaml'].map((filename) => path.join(project.fullPath, filename)).find((filePath) => existsSync(filePath))

    if (!taskfilePath) {
        return []
    }

    const lines = readFileSync(taskfilePath, 'utf8').split('\n')
    const tasksIndex = lines.findIndex((line) => line.trim() === 'tasks:')

    if (tasksIndex === -1) {
        return []
    }

    return lines
        .slice(tasksIndex + 1)
        .map((line) => line.match(/^\s{2}([A-Za-z0-9_.-]+):/)?.[1])
        .filter(isString)
        .filter((target, index, targets) => targets.indexOf(target) === index)
        .map((target) => ({
            title: target,
            command: 'task',
            args: [target],
            source: path.basename(taskfilePath),
        }))
}

function getProjectScripts(project: Project): ProjectScript[] {
    return [...getPackageScripts(project), ...getMakeTargets(project), ...getJustTargets(project), ...getTaskfileTargets(project)]
}

function getCommandText(script: ProjectScript): string {
    return [script.command, ...script.args].join(' ')
}

function ScriptRunnerDetail({ project, script }: ScriptRunnerDetailProps) {
    const { isLoading, data, error } = useExec(script.command, script.args, { cwd: project.fullPath })
    const commandText = getCommandText(script)

    const markdown = `
# ${script.title}

\`${commandText}\`

## Output

\`\`\`bash
${data || (isLoading ? 'Running...' : '')}
${error ? error.message : ''}
\`\`\`
`

    return (
        <Detail
            isLoading={isLoading}
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action.CopyToClipboard
                        title="Copy Command"
                        content={commandText}
                        shortcut={{ modifiers: ['cmd'], key: 'c' }}
                    />
                    <OpenInTerminal project={project} />
                    <OpenInEditor project={project} />
                </ActionPanel>
            }
        />
    )
}

function ProjectScriptsList({ project }: ProjectScriptsProps) {
    const scripts = getProjectScripts(project)
    const groupedScripts = scripts.reduce<Record<string, ProjectScript[]>>((groups, script) => {
        groups[script.source] = groups[script.source] || []
        groups[script.source].push(script)
        return groups
    }, {})

    return (
        <List
            navigationTitle={`${project.name} Scripts`}
            searchBarPlaceholder="Search scripts..."
        >
            {scripts.length === 0 && (
                <List.EmptyView
                    icon={Icon.Terminal}
                    title="No project scripts found"
                    description="No package scripts, Makefile targets, justfile recipes, or Taskfile tasks were detected."
                />
            )}
            {Object.entries(groupedScripts).map(([source, sourceScripts]) => (
                <List.Section
                    key={source}
                    title={source}
                >
                    {sourceScripts.map((script, index) => (
                        <List.Item
                            key={`${script.source}-${script.title}`}
                            title={script.title}
                            subtitle={getCommandText(script)}
                            icon={Icon.Terminal}
                            actions={
                                <ActionPanel>
                                    <Action.Push
                                        title="Run Script"
                                        icon={Icon.Play}
                                        shortcut={index === 0 ? { modifiers: ['cmd'], key: 'enter' } : undefined}
                                        target={
                                            <ScriptRunnerDetail
                                                project={project}
                                                script={script}
                                            />
                                        }
                                    />
                                    <Action.CopyToClipboard
                                        title="Copy Command"
                                        content={getCommandText(script)}
                                        icon={Icon.Clipboard}
                                        shortcut={{ modifiers: ['cmd'], key: 'c' }}
                                    />
                                </ActionPanel>
                            }
                        />
                    ))}
                </List.Section>
            ))}
        </List>
    )
}

export default function ProjectScripts({ project }: ProjectScriptsProps) {
    return (
        <Action.Push
            title="Project Scripts"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
            target={<ProjectScriptsList project={project} />}
        />
    )
}
