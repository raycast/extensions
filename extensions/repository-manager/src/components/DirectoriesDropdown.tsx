import React from 'react'
import { Color, Icon, Image, List } from '@raycast/api'
import { useCachedState } from '@raycast/utils'

type DirectoriesDropdownProps = {
    directories: Directory[]
    availableTags: string[]
    selectedTags: string[]
    onSelectedTagsChange: (tags: string[]) => void
}

export type Directory = {
    name: string
    icon: Image | null
    color: Color | null
}

export function useDirectory() {
    const [directory, setDirectory] = useCachedState<string>('directory', 'all')
    return { directory, setDirectory }
}

const healthFilters = [
    {
        title: 'Needs Attention',
        value: 'needs-attention',
        icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
    },
    {
        title: 'Dirty',
        value: 'dirty',
        icon: { source: Icon.Pencil, tintColor: Color.Orange },
    },
    {
        title: 'Ahead',
        value: 'ahead',
        icon: { source: Icon.ArrowUp, tintColor: Color.Green },
    },
    {
        title: 'Behind',
        value: 'behind',
        icon: { source: Icon.ArrowDown, tintColor: Color.Red },
    },
    {
        title: 'No Upstream',
        value: 'no-upstream',
        icon: { source: Icon.Link, tintColor: Color.SecondaryText },
    },
    {
        title: 'Recently Opened',
        value: 'recent',
        icon: Icon.Clock,
    },
]

function getDropdownValue(directory: string, selectedTags: string[]): string {
    if (selectedTags.length === 1) {
        return `tag:${selectedTags[0]}`
    }

    if (selectedTags.length > 1) {
        return 'tags:multiple'
    }

    return directory
}

export const DirectoriesDropdown = React.memo(({ directories, availableTags, selectedTags, onSelectedTagsChange }: DirectoriesDropdownProps) => {
    const { directory, setDirectory } = useDirectory()
    const value = getDropdownValue(directory, selectedTags)

    function handleChange(nextValue: string) {
        if (nextValue.startsWith('tag:')) {
            setDirectory('all')
            onSelectedTagsChange([nextValue.replace(/^tag:/, '')])
            return
        }

        onSelectedTagsChange([])
        setDirectory(nextValue === 'tags:multiple' ? 'all' : nextValue)
    }

    return (
        <List.Dropdown
            tooltip="Filter Repositories"
            onChange={handleChange}
            value={value}
        >
            <List.Dropdown.Section>
                <List.Dropdown.Item
                    key="all"
                    title="All"
                    value="all"
                    icon={Icon.HardDrive}
                />
                <List.Dropdown.Item
                    key="favorites"
                    title="Favorites"
                    value="favorites"
                    icon={{
                        source: Icon.Star,
                        tintColor: Color.Yellow,
                    }}
                />
            </List.Dropdown.Section>
            <List.Dropdown.Section title="Health">
                {healthFilters.map((filter) => (
                    <List.Dropdown.Item
                        key={filter.value}
                        title={filter.title}
                        value={filter.value}
                        icon={filter.icon}
                    />
                ))}
            </List.Dropdown.Section>
            {availableTags.length > 0 && (
                <List.Dropdown.Section title="Tags">
                    {selectedTags.length > 1 && (
                        <List.Dropdown.Item
                            key="tags:multiple"
                            title={`Multiple Tags (${selectedTags.length})`}
                            value="tags:multiple"
                            icon={Icon.Tag}
                        />
                    )}
                    {availableTags.map((tag) => (
                        <List.Dropdown.Item
                            key={`tag:${tag}`}
                            title={tag}
                            value={`tag:${tag}`}
                            icon={Icon.Tag}
                        />
                    ))}
                </List.Dropdown.Section>
            )}
            <List.Dropdown.Section title="Folders">
                {directories.map((dir: Directory, index: number) => (
                    <List.Dropdown.Item
                        key={`${dir.name}-${index}`}
                        title={dir.name}
                        value={dir.name}
                        icon={dir.icon}
                    />
                ))}
            </List.Dropdown.Section>
        </List.Dropdown>
    )
})

DirectoriesDropdown.displayName = 'DirectoriesDropdown'
