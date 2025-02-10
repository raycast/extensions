import { useEffect, useState } from 'react'
import { showHUD, Action, ActionPanel, Icon, List } from '@raycast/api'
import { runAppleScriptSilently } from './runAppleScriptSilently'

const brands = [
    {
        name: 'CherryMX',
        switchSets: [
            {
                name: 'Japanese Black',
                color: '#57534e'
            }
        ]
    },
    {
        name: 'Everglide',
        switchSets: [
            {
                name: 'Crystal Purple',
                color: '#f0abfc'
            },
            {
                name: 'Oreo',
                color: '#9e9894'
            }
        ]
    },
    {
        name: 'Flurples',
        switchSets: [
            {
                name: 'Cardboard',
                color: '#f6ac8a'
            }
        ]
    },
    {
        name: 'Gateron',
        switchSets: [
            {
                name: 'Milky Yellow',
                color: '#feedac'
            }
        ]
    },
    {
        name: 'NovelKeys',
        switchSets: [
            {
                name: 'Cream',
                color: '#ffedd5'
            }
        ]
    }
]

export async function setSwitchSet(name: string) {
    await runAppleScriptSilently(`tell application "Klack" to switch ${name}`, false)
    await showHUD(`Selected ${name}`)
}

export default function Command() {
    const [searchText, setSearchText] = useState('')
    const [filteredList, filterList] = useState(brands)
    const [currentSwitchSet, setCurrentSwitchSet] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        filterList(
            brands.map((brand) => {
                return {
                    ...brand,
                    switchSets: brand.switchSets.filter((switchSet) =>
                        switchSet.name.toLowerCase().includes(searchText)
                    )
                }
            })
        )
    }, [searchText])

    useEffect(() => {
        const getCurrentSwitchSet = async () => {
            const switchSet = await runAppleScriptSilently(
                'tell application "Klack" to current switch',
                true
            )

            if (switchSet) {
                setCurrentSwitchSet(switchSet)
                setIsLoading(false)
            }
        }

        getCurrentSwitchSet()
    }, [setCurrentSwitchSet])

    async function handleAction(switchSet: string) {
        setSwitchSet(switchSet)
        setCurrentSwitchSet(switchSet.toLowerCase())
    }

    return (
        <List
            filtering={false}
            onSearchTextChange={setSearchText}
            navigationTitle="Select Switch Sets"
            searchBarPlaceholder="Select Switch Set"
            isLoading={isLoading}>
            {filteredList.map((brand) => (
                <List.Section key={brand.name} title={`${brand.name}™`}>
                    {brand.switchSets.map((switchSet) => (
                        <List.Item
                            key={switchSet.name}
                            title={switchSet.name}
                            subtitle={
                                switchSet.name.toLowerCase() === currentSwitchSet ? 'Current' : ''
                            }
                            icon={{ source: Icon.PlusSquare, tintColor: switchSet.color }}
                            actions={
                                <ActionPanel>
                                    <Action
                                        title="Select"
                                        onAction={() => {
                                            currentSwitchSet
                                                ? handleAction(switchSet.name)
                                                : undefined
                                        }}
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
