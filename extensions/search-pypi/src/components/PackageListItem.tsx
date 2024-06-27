import {
  List,
  Icon,
  ActionPanel,
  Action,
  getPreferenceValues,
  showToast,
  Toast,
} from '@raycast/api'
import tinyRelativeDate from 'tiny-relative-date'
import { CopyInstallCommandActions } from './CopyInstallCommandActions'
import type { HistoryItem } from '../utils/history-storage'
import { addToHistory } from '../utils/history-storage'
import {
  addFavorite,
  removeAllItemsFromFavorites,
  removeItemFromFavorites,
} from '../utils/favorite-storage'
import Favorites from '../favorites'
import { PyPIPackage } from '../model/pypiSearch.model'

interface PackageListItemProps {
  result: PyPIPackage
  searchTerm?: string
  setHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>
  isFavorited: boolean
  handleFaveChange?: () => Promise<void>
  isViewingFavorites?: boolean
}

export interface Preferences {
  defaultOpenAction: 'pypiPackagePage'
  historyCount: string
  showLinkToSearchResultsInListView: boolean
}

export const PackageListItem = ({
  result,
  setHistory,
  isFavorited,
  handleFaveChange,
  isViewingFavorites,
}: PackageListItemProps): JSX.Element => {
  const { defaultOpenAction }: Preferences = getPreferenceValues()
  const pkg = result

  const link = `https://pypi.org/project/${pkg.name}`

  const handleAddToHistory = async () => {
    const history = await addToHistory({ term: pkg.name, type: 'package' })
    setHistory?.(history)
    showToast(Toast.Style.Success, `Added ${result.name} to history`)
  }

  const handleAddToFaves = async () => {
    await addFavorite(result)
    showToast(Toast.Style.Success, `Added ${result.name} to faves`)
    handleFaveChange?.()
  }
  const handleRemoveFromFaves = async () => {
    await removeItemFromFavorites(result)
    showToast(Toast.Style.Success, `Removed ${result.name} from faves`)
    handleFaveChange?.()
  }
  const handleRemoveAllFaves = async () => {
    await removeAllItemsFromFavorites()
    showToast(Toast.Style.Success, `Removed ${result.name} from faves`)
    handleFaveChange?.()
  }

  const openActions = {
    openRepository: (
      <Action.OpenInBrowser
        key="pyiPackagePage"
        url={link}
        title="Open PyPI Package Page"
        onOpen={handleAddToHistory}
      />
    ),
  }

  const accessories: List.Item.Accessory[] = []

  if (!isViewingFavorites) {
    accessories.push(
      {
        text: `v${pkg.version}`,
        tooltip: `Latest version`,
      },
      {
        icon: Icon.Calendar,
        tooltip: `Last updated: ${tinyRelativeDate(new Date(pkg.dateUpdated))}`,
      },
    )
    if (isFavorited) {
      accessories.push({
        icon: Icon.Star,
      })
    }
  }

  return (
    <List.Item
      id={pkg.name}
      key={pkg.name}
      title={pkg.name}
      subtitle={pkg.description}
      icon={Icon.Box}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            {Object.entries(openActions)
              .sort(([a]) => {
                if (a === defaultOpenAction) {
                  return -1
                } else {
                  return 0
                }
              })
              .map(([, action]) => {
                if (!action) {
                  return null
                }
                return action
              })
              .filter(Boolean)}
          </ActionPanel.Section>
          <ActionPanel.Section title="Actions">
            {isFavorited ? (
              <Action
                title="Remove From Favorites"
                onAction={handleRemoveFromFaves}
                icon={Icon.StarDisabled}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 's' }}
                style={Action.Style.Destructive}
              />
            ) : (
              <Action
                title="Add to Favorites"
                onAction={handleAddToFaves}
                icon={Icon.Star}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 's' }}
              />
            )}
            {isViewingFavorites ? (
              <Action
                title="Remove All Favorites"
                onAction={handleRemoveAllFaves}
                icon={Icon.Trash}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'backspace' }}
                style={Action.Style.Destructive}
              />
            ) : (
              <Action.Push
                title="View Favorites"
                target={<Favorites />}
                icon={Icon.ArrowRight}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            <Action.OpenInBrowser
              url={`https://pypistats.org/packages/${pkg.name}`}
              title="Open PyPI Stats"
              icon={Icon.LevelMeter}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'enter' }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyInstallCommandActions packageName={pkg.name} />
            <Action.CopyToClipboard
              title="Copy Package Name"
              content={pkg.name}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}
