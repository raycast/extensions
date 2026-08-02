import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { useEffect, useState } from 'react'

type Skill = {
    name: string
    description: string
    filePath: string
    contents: string
}

const skillsDirectory = join(homedir(), '.agents', 'skills')

function frontmatterValue(frontmatter: string, key: string): string | undefined {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
    return match?.[1]?.trim().replace(/^['"]|['"]$/g, '')
}

function piSkillBlock(skill: Skill): string {
    const body = skill.contents.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim()
    return `<skill name="${skill.name}" location="${skill.filePath}">\nReferences are relative to ${dirname(skill.filePath)}.\n\n${body}\n</skill>`
}

async function findSkills(directory: string): Promise<Skill[]> {
    const entries = await readdir(directory, { withFileTypes: true })
    const skills = await Promise.all(
        entries.map(async (entry): Promise<Skill[]> => {
            const entryPath = join(directory, entry.name)
            if (entry.isDirectory()) return findSkills(entryPath)
            if (entry.name !== 'SKILL.md') return []

            const contents = await readFile(entryPath, 'utf8')
            const frontmatter = contents.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
            return [
                {
                    name: frontmatterValue(frontmatter, 'name') ?? entry.name,
                    description: frontmatterValue(frontmatter, 'description') ?? '',
                    filePath: entryPath,
                    contents,
                },
            ]
        }),
    )

    return skills.flat().sort((a, b) => a.name.localeCompare(b.name))
}

export default function PasteAgentSkill() {
    const [skills, setSkills] = useState<Skill[]>([])
    const [error, setError] = useState<string>()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        findSkills(skillsDirectory)
            .then(setSkills)
            .catch((reason: unknown) => setError(String(reason)))
            .finally(() => setIsLoading(false))
    }, [])

    if (error) {
        return (
            <List.EmptyView
                icon={Icon.ExclamationMark}
                title="Could not load agent skills"
                description={error}
            />
        )
    }

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Filter agent skills by name">
            {skills.map((skill) => (
                <List.Item
                    key={skill.filePath}
                    icon={Icon.Document}
                    title={skill.name}
                    subtitle={skill.description}
                    actions={
                        <ActionPanel>
                            <Action.Paste content={piSkillBlock(skill)} title="Paste Pi Skill" />
                            <Action.CopyToClipboard
                                content={piSkillBlock(skill)}
                                title="Copy Pi Skill"
                            />
                            <Action.Open title="Open Skill File" target={skill.filePath} />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    )
}
