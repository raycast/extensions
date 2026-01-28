import React from 'react'
import { Color, Icon, Image, List } from '@raycast/api'
import { useCachedState } from '@raycast/utils'

type DirectoriesDropdownProps = {
    directories: Directory[]
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

export const DirectoriesDropdown = React.memo(({ directories }: DirectoriesDropdownProps) => {
    const { directory, setDirectory } = useDirectory()

    return (
        <List.Dropdown
            tooltip="Select Project Directory"
            onChange={setDirectory}
            value={directory}
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
            <List.Dropdown.Section>
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
