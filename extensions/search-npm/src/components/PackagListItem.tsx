import {
  List,
  Icon,
  ActionPanel,
  Action,
  getPreferenceValues,
  showToast,
  Toast,
  Keyboard,
} from '@raycast/api'
import tinyRelativeDate from 'tiny-relative-date'
import { CopyInstallCommandActions } from './CopyInstallCommandActions'
import { parseRepoUrl } from '../utils/parseRepoUrl'
import { getChangeLogUrl } from '../utils/getChangelogUrl'
import { Readme } from '../screens/Readme'
import type { Package } from '../model/npmResponse.model'
import type { HistoryItem } from '../utils/history-storage'
import { addToHistory, removeItemFromHistory } from '../utils/history-storage'
import {
  addFavorite,
  removeAllItemsFromFavorites,
  removeItemFromFavorites,
} from '../utils/favorite-storage'
import Favorites from '../favorites'

interface PackageListItemProps {
  result: Package
  searchTerm?: string
  setHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>
  isFavorited: boolean
  handleFaveChange?: () => Promise<void>
  isViewingFavorites?: boolean
  isHistoryItem?: boolean
}

export const PackageListItem = ({
  result,
  setHistory,
  isFavorited,
  handleFaveChange,
  isViewingFavorites,
  isHistoryItem,
}: PackageListItemProps): JSX.Element => {
  const { defaultOpenAction, historyCount } =
    getPreferenceValues<ExtensionPreferences>()
  const pkg = result
  const { owner, name, type, repoUrl } = parseRepoUrl(pkg.links?.repository)
  const changelogUrl = getChangeLogUrl(type, owner, name)

  const handleAddToHistory = async () => {
    const history = await addToHistory({
      term: pkg.name,
      type: 'package',
      package: result,
    })
    if (Number(historyCount) <= 0) return
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
    openRepository: repoUrl ? (
      <Action.OpenInBrowser
        key="openRepository"
        url={repoUrl}
        title="Open Repository"
        onOpen={handleAddToHistory}
      />
    ) : null,
    openHomepage:
      pkg.links?.homepage && pkg.links.homepage !== repoUrl ? (
        <Action.OpenInBrowser
          key="openHomepage"
          url={pkg.links.homepage}
          title="Open Homepage"
          icon={Icon.Link}
          onOpen={handleAddToHistory}
        />
      ) : null,
    npmPackagePage: (
      <Action.OpenInBrowser
        key="npmPackagePage"
        url={pkg.links.npm}
        title="Open npm Package Page"
        icon={{
          source: 'command-icon.png',
        }}
        onOpen={handleAddToHistory}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    ),
    changelogPackagePage: changelogUrl ? (
      <Action.OpenInBrowser
        key="openChangelog"
        url={changelogUrl}
        title="Open Changelog"
      />
    ) : null,
    skypackPackagePage: (
      <Action.OpenInBrowser
        url={`https://www.skypack.dev/view/${pkg.name}`}
        title="Skypack Package Page"
        key="skypackPackagePage"
        onOpen={handleAddToHistory}
      />
    ),
  }

  const accessories: List.Item.Accessory[] = [
    pkg?.keywords?.length
      ? {
          icon: Icon.Tag,
          tooltip: pkg.keywords.join(', '),
        }
      : {},
  ]
  if (!isViewingFavorites) {
    accessories.push(
      {
        text: `v${pkg.version}`,
        tooltip: `Latest version`,
      },
      {
        icon: Icon.Calendar,
        tooltip: `Last updated: ${tinyRelativeDate(new Date(pkg.date))}`,
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
      keywords={pkg.keywords}
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
                title="Remove from Favorites"
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
            {isHistoryItem && (
              <Action
                title="Remove from History"
                onAction={async () => {
                  const history = await removeItemFromHistory({
                    term: pkg.name,
                    type: 'package',
                  })
                  setHistory?.(history)
                }}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            {type === 'github' && owner && name ? (
              <Action.Push
                title="View Readme"
                target={<Readme user={owner} repo={name} />}
                icon={Icon.Paragraph}
              />
            ) : null}
            <Action.OpenInBrowser
              url={`https://bundlephobia.com/package/${pkg.name}`}
              title="Open Bundlephobia"
              icon={Icon.LevelMeter}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'enter' }}
            />
            <Action.OpenInBrowser
              url={`https://esm.sh/${pkg.name}`}
              title="Open Esm.sh URL"
              icon={Icon.Cloud}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'e' }}
            />
            {repoUrl && type === 'github' ? (
              <Action.OpenInBrowser
                url={repoUrl.replace('github.com', 'github.dev')}
                title="View Code in Github.dev"
                icon={{
                  source: {
                    light: 'github-bright.png',
                    dark: 'github-dark.png',
                  },
                }}
                shortcut={{ modifiers: ['cmd'], key: '.' }}
              />
            ) : null}
            {type === 'github' || (type === 'gitlab' && owner && name) ? (
              <Action.OpenInBrowser
                url={`https://codesandbox.io/s/${
                  type === 'github' ? 'github' : 'gitlab'
                }/${owner}/${name}`}
                title="View in Codesandbox"
                icon={{
                  source: {
                    light: 'codesandbox-bright.png',
                    dark: 'codesandbox-dark.png',
                  },
                }}
              />
            ) : null}
            <Action.OpenInBrowser
              url={`https://snyk.io/vuln/npm:${pkg.name}`}
              title="Open Snyk Vulnerability Check"
              icon={{
                source: {
                  light: 'snyk-bright.png',
                  dark: 'snyk-dark.png',
                },
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyInstallCommandActions packageName={pkg.name} />
            <Action.CopyToClipboard
              title="Copy Package Name"
              content={pkg.name}
            />
            <Action.CopyToClipboard
              title="Copy Version"
              content={pkg.version}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}
