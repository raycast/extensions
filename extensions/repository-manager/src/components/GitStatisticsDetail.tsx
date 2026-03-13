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

export default function GitStatisticsDetail({ project }: GitStatisticsDetailProps) {
    const { push, pop } = useNavigation()
    const [clocAvailable, setClocAvailable] = useState<boolean | null>(null)

    const { isLoading: isLoadingCommits, data: totalCommits } = useExec('git', ['rev-list', '--all', '--count'], { cwd: project.fullPath })
    const { isLoading: isLoadingBranches, data: totalBranches } = useExec('git', ['branch', '-r'], { cwd: project.fullPath, parseOutput: (output) => output.stdout.split('\n').length - 1 })
    const { isLoading: isLoadingTags, data: totalTags } = useExec('git', ['tag'], { cwd: project.fullPath, parseOutput: (output) => output.stdout.split('\n').length - 1 })

    // First check if cloc is available
    const { isLoading: isCheckingCloc, error: clocCheckError } = useExec('which', ['cloc'], {
        env: {
            ...process.env,
            PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:' + (process.env.PATH || ''),
        },
        parseOutput: (output) => {
            if (output.stdout && output.stdout.trim().length > 0) {
                setClocAvailable(true)
                return output.stdout.trim()
            }
            return null
        },
    })

    // Only run cloc if we confirmed it's available
    const { isLoading: isLoadingCloc, data: clocData } = useExec('cloc', ['.', '--exclude-dir=node_modules,vendor,.git,dist,build', '--git', '--exclude-ext=lock'], {
        cwd: project.fullPath,
        execute: clocAvailable === true,
        timeout: 30000, // 30 second timeout
        env: {
            ...process.env,
            PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:' + (process.env.PATH || ''),
        },
        parseOutput: (output) => {
            if (output.stdout && output.stdout.trim().length > 0) {
                return output.stdout
            }
            return null
        },
    })

    // Set cloc as unavailable if the version check failed
    useEffect(() => {
        if (clocCheckError && clocAvailable !== false) {
            setClocAvailable(false)
        }
    }, [clocCheckError, clocAvailable])

    // Handle cloc errors
    useEffect(() => {
        if (clocAvailable === false) {
            showFailureToast('Code Statistics Error', { title: 'cloc command not found' })
        } else if (clocAvailable === true && !isLoadingCloc && (!clocData || clocData.trim().length === 0)) {
            showFailureToast('Code Statistics Error', { title: 'cloc command failed to generate statistics' })
        }
    }, [clocAvailable, isLoadingCloc, clocData])

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

    const isLoading = isLoadingCommits || isLoadingBranches || isLoadingTags || isLoadingCommitsByPerson || isCheckingCloc || (clocAvailable === true && isLoadingCloc)

    const formatClocData = (clocData: string): string => {
        const lines = clocData.trim().split('\n')

        const headerIndex = lines.findIndex((line) => line.trim().startsWith('Language'))
        if (headerIndex === -1) {
            return clocData
        }

        const dataLines = lines.slice(headerIndex + 2) // Skip header and separator line

        const tableRows: string[] = []

        for (const line of dataLines) {
            const trimmedLine = line.trim()
            if (/^-+$/.test(trimmedLine) || trimmedLine === '') {
                continue
            }

            if (trimmedLine.startsWith('SUM:')) {
                const sumParts = trimmedLine.replace('SUM:', '').trim().split(/\s+/).filter(Boolean)
                if (sumParts.length === 4) {
                    tableRows.push(`| *SUM* | *${sumParts[0]}* | *${sumParts[1]}* | *${sumParts[2]}* | *${sumParts[3]}* |`)
                }
                continue
            }

            const match = trimmedLine.match(/^(.*[^\s])\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/)
            if (match) {
                // match[1] is language, [2] is files, [3] is blank, [4] is comment, [5] is code
                const language = match[1].replace(/\|/g, '\\|')
                const files = match[2]
                const blank = match[3]
                const comment = match[4]
                const code = match[5]
                tableRows.push(`| ${language} | ${files} | ${blank} | ${comment} | ${code} |`)
            }
        }

        if (tableRows.length === 0) {
            return clocData
        }

        const markdownTable = ['| Language | Files | Blank | Comment | Code |', '|---|---|---|---|---|', ...tableRows].join('\n')

        return markdownTable
    }

    const getClocSection = () => {
        if (isCheckingCloc) {
            return 'Checking if cloc is available...'
        }

        if (clocAvailable === true && isLoadingCloc) {
            return 'Generating code statistics...'
        }

        if (clocAvailable === true && clocData && clocData.trim().length > 0) {
            return formatClocData(clocData)
        }

        // Show installation instructions for any case where cloc is not working
        return `**cloc not found** - Install [cloc](https://github.com/AlDanial/cloc) to get detailed code statistics including lines of code, comments, and blank lines by language.

**Installation options:**
- **macOS:** \`brew install cloc\`
- **npm:** \`npm install -g cloc\``
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
${getClocSection()}
`

    return (
        <Detail
            isLoading={isLoading}
            markdown={markdown}
            actions={
                <ActionPanel>
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
