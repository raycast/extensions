import { Action, ActionPanel, Detail, Icon, useNavigation } from '@raycast/api'
import { Project } from '../project'
import { useExec, showFailureToast } from '@raycast/utils'
import { OpenInEditor, OpenInTerminal } from './Open'
import OpenGitRemotes from './OpenGitRemotes'
import GitStatusDetail from './GitStatusDetail'
import { useEffect, useState } from 'react'

type GitStatisticsDetailProps = {
    project: Project
}

type CommitStat = {
    count: string
    name: string
}

const commandPath = ['/opt/homebrew/bin', '/usr/local/bin', process.env.HOME ? `${process.env.HOME}/.cargo/bin` : null, '/usr/bin', '/bin', process.env.PATH || null].filter((path): path is string => Boolean(path)).join(':')

const tokeiArgs = ['.', '--compact', '--exclude', 'node_modules', '--exclude', 'vendor', '--exclude', '.git', '--exclude', 'dist', '--exclude', 'build', '--exclude', 'target', '--exclude', 'coverage', '--exclude', '.next', '--exclude', '.nuxt', '--exclude', '.turbo', '--exclude', '.cache', '--exclude', 'tmp', '--exclude', '*.lock', '--exclude', '*-lock.*', '--exclude', 'bun.lockb']

export default function GitStatisticsDetail({ project }: GitStatisticsDetailProps) {
    const { push, pop } = useNavigation()
    const [tokeiAvailable, setTokeiAvailable] = useState<boolean | null>(null)

    const { isLoading: isLoadingCommits, data: totalCommits } = useExec('git', ['rev-list', '--all', '--count'], { cwd: project.fullPath })
    const { isLoading: isLoadingBranches, data: totalBranches } = useExec('git', ['branch', '-r'], { cwd: project.fullPath, parseOutput: (output) => output.stdout.split('\n').length - 1 })
    const { isLoading: isLoadingTags, data: totalTags } = useExec('git', ['tag'], { cwd: project.fullPath, parseOutput: (output) => output.stdout.split('\n').length - 1 })

    // First check if tokei is available
    const {
        isLoading: isCheckingTokei,
        error: tokeiCheckError,
        revalidate: revalidateTokeiCheck,
    } = useExec('which', ['tokei'], {
        env: {
            ...process.env,
            PATH: commandPath,
        },
        parseOutput: (output) => {
            if (output.stdout && output.stdout.trim().length > 0) {
                setTokeiAvailable(true)
                return output.stdout.trim()
            }
            return null
        },
    })

    // Only run tokei if we confirmed it's available
    const { isLoading: isLoadingTokei, data: tokeiData } = useExec('tokei', tokeiArgs, {
        cwd: project.fullPath,
        execute: tokeiAvailable === true,
        timeout: 30000, // 30 second timeout
        env: {
            ...process.env,
            PATH: commandPath,
        },
        parseOutput: (output) => {
            if (output.stdout && output.stdout.trim().length > 0) {
                return output.stdout
            }
            return null
        },
    })

    // Set tokei as unavailable if the version check failed
    useEffect(() => {
        if (tokeiCheckError && tokeiAvailable !== false) {
            setTokeiAvailable(false)
        }
    }, [tokeiCheckError, tokeiAvailable])

    // Handle tokei errors
    useEffect(() => {
        if (tokeiAvailable === false) {
            showFailureToast('Code Statistics Error', { title: 'tokei command not found' })
        } else if (tokeiAvailable === true && !isLoadingTokei && (!tokeiData || tokeiData.trim().length === 0)) {
            showFailureToast('Code Statistics Error', { title: 'tokei command failed to generate statistics' })
        }
    }, [tokeiAvailable, isLoadingTokei, tokeiData])

    const { isLoading: isLoadingCommitsByPerson, data: commitsByPerson } = useExec('git', ['shortlog', '-s', '-n', '--all'], {
        cwd: project.fullPath,
        timeout: 10000, // 10 second timeout
        parseOutput: (output) => {
            try {
                if (!output.stdout || output.stdout.trim() === '') {
                    return []
                }

                const lines = output.stdout.trim().split('\n')

                const results = lines
                    .map((line) => {
                        const trimmedLine = line.trim()
                        if (!trimmedLine) {
                            return null
                        }

                        // Git shortlog format: "     5	Author Name <email@example.com>"
                        // or just: "     5	Author Name"
                        const match = trimmedLine.match(/^(\d+)\s+(.+)$/)
                        if (!match) {
                            return null
                        }

                        const count = match[1]
                        const name = match[2].replace(/<[^>]*>/g, '').trim() // Remove email if present

                        return {
                            count,
                            name,
                        }
                    })
                    .filter((item): item is CommitStat => item !== null)
                    .slice(0, 10) // Limit to top 10 contributors for performance

                return results
            } catch (error) {
                console.error('Failed to parse commit statistics:', error)
                return []
            }
        },
    })

    const isLoading = isLoadingCommits || isLoadingBranches || isLoadingTags || isLoadingCommitsByPerson

    const refreshCodeStatistics = () => {
        setTokeiAvailable(null)
        revalidateTokeiCheck()
    }

    const formatTokeiData = (tokeiData: string): string => {
        const lines = tokeiData.trim().split('\n')

        const headerIndex = lines.findIndex((line) => line.trim().startsWith('Language'))
        if (headerIndex === -1) {
            return tokeiData
        }

        const dataLines = lines.slice(headerIndex + 2) // Skip header and separator line

        const tableRows: string[] = []

        for (const line of dataLines) {
            const trimmedLine = line.trim()
            if (/^-+$/.test(trimmedLine) || /^=+$/.test(trimmedLine) || trimmedLine === '') {
                continue
            }

            const match = trimmedLine.match(/^(.*[^\s])\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/)
            if (match) {
                // match[1] is language, [2] is files, [3] is lines, [4] is code, [5] is comments, [6] is blanks
                const isTotalRow = match[1] === 'Total'
                const language = isTotalRow ? '**Total**' : match[1].replace(/\|/g, '\\|')
                const files = match[2]
                const lines = match[3]
                const code = match[4]
                const comments = match[5]
                const blanks = match[6]
                tableRows.push(isTotalRow ? `| ${language} | **${files}** | **${lines}** | **${code}** | **${comments}** | **${blanks}** |` : `| ${language} | ${files} | ${lines} | ${code} | ${comments} | ${blanks} |`)
            }
        }

        if (tableRows.length === 0) {
            return tokeiData
        }

        const markdownTable = ['| Language | Files | Lines | Code | Comments | Blank |', '|---|---|---|---|---|---|', ...tableRows].join('\n')

        return markdownTable
    }

    const getTokeiSection = () => {
        if (isCheckingTokei) {
            return 'Checking if tokei is available...'
        }

        if (tokeiAvailable === true && isLoadingTokei) {
            return 'Generating code statistics...'
        }

        if (tokeiAvailable === true && tokeiData && tokeiData.trim().length > 0) {
            return formatTokeiData(tokeiData)
        }

        // Show installation instructions for any case where tokei is not working
        return `**tokei not found** - Install [tokei](https://github.com/XAMPPRocky/tokei) to get detailed code statistics including lines of code, comments, and blank lines by language.

**Installation options:**
- **macOS:** \`brew install tokei\`
- **Cargo:** \`cargo install tokei\``
    }

    const getRepoStats = () => {
        if (isLoadingCommits || isLoadingBranches || isLoadingTags) {
            return 'Loading...'
        }
        return `Commits: **${totalCommits}**\nBranches: **${totalBranches}**\nTags: **${totalTags}**`
    }

    const getTopCommitters = () => {
        if (isLoadingCommitsByPerson) {
            return 'Loading...'
        }
        if (!commitsByPerson || commitsByPerson.length === 0) {
            return 'No data available'
        }
        // Show top 5 contributors, one per line
        return commitsByPerson
            .slice(0, 5)
            .map((person) => `**${person.name}:** ${person.count}`)
            .join('\n')
    }

    const generateStatsTable = () => {
        const repoStatsLines = getRepoStats().split('\n')
        const topCommittersLines = getTopCommitters().split('\n')

        const maxRows = Math.max(repoStatsLines.length, topCommittersLines.length)

        const rows: string[] = []
        for (let i = 0; i < maxRows; i++) {
            const repoStat = repoStatsLines[i] || ''
            const committer = topCommittersLines[i] || ''
            rows.push(`| ${repoStat} | ${committer} |`)
        }
        return rows.join('\n')
    }

    const markdown = `
# ${project.name}

| Repo Statistics | Commits by Person |
|:---------------|:------------------|
${generateStatsTable()}

## Code Statistics
${getTokeiSection()}
`

    return (
        <Detail
            isLoading={isLoading}
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action
                        title="Refresh Code Statistics"
                        icon={Icon.BarChart}
                        shortcut={{ modifiers: ['cmd'], key: 'l' }}
                        onAction={refreshCodeStatistics}
                    />
                    <Action
                        title="Close"
                        icon={Icon.XMarkCircle}
                        onAction={() => pop()}
                    />
                    <OpenInEditor project={project} />
                    <OpenInTerminal project={project} />
                    <OpenGitRemotes project={project} />
                    <Action
                        title="Git Status"
                        icon={Icon.Download}
                        shortcut={{ modifiers: ['cmd'], key: 'g' }}
                        onAction={() => push(<GitStatusDetail project={project} />)}
                    />
                </ActionPanel>
            }
        />
    )
}
