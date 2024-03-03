import {
  Icon,
  MenuBarExtra,
  getPreferenceValues,
  open,
  type Keyboard,
} from '@raycast/api'
import { getFavicon } from '@raycast/utils'
import { useRecents } from './useRecents'
import { useAuth } from './use-auth'
import formatTitle from 'title'
import urlJoin from 'proper-url-join'
import { useMeta } from './useMeta'

const prefs = getPreferenceValues()

export default function Command() {
  const { isLoading: authIsLoading, error } = useAuth()
  if (error) {
    return (
      <MenuBarExtra
        icon={{ source: 'command-icon.png' }}
        isLoading={authIsLoading}
      >
        <MenuBarExtra.Item
          title="Error: you have not signed in"
          icon={Icon.Alarm}
        />
      </MenuBarExtra>
    )
  }

  const { data, isLoading } = useRecents('all', 9)
  const { data: metadata } = useMeta()
  const tags = metadata?.tags.slice(0, 10)
  const recentAllBookmarks = data?.slice(0, 9)

  return (
    <MenuBarExtra icon={{ source: 'command-icon.png' }} isLoading={isLoading}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Dashboard"
          onAction={() => open(prefs.otterBasePath)}
          icon={Icon.Gauge}
        />
        <MenuBarExtra.Item
          title="Feed"
          onAction={() => open(urlJoin(prefs.otterBasePath, 'feed'))}
          icon={Icon.BulletPoints}
        />
        <MenuBarExtra.Item
          title="Public"
          onAction={() => open(urlJoin(prefs.otterBasePath, 'public'))}
          icon={Icon.Eye}
        />
        <MenuBarExtra.Item
          title="Stars"
          onAction={() => open(urlJoin(prefs.otterBasePath, 'stars'))}
          icon={Icon.Star}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Recent">
        {recentAllBookmarks?.map((bookmark, index) => {
          if (!bookmark.url || !bookmark.title) {
            return null
          }
          const type = bookmark?.type ? formatTitle(bookmark.type) : ''
          return (
            <MenuBarExtra.Item
              key={bookmark.url}
              icon={getFavicon(bookmark.url)}
              title={bookmark.title}
              onAction={() => open(bookmark.url ?? '')}
              subtitle={type}
              tooltip={bookmark.description ?? ''}
              shortcut={{
                modifiers: ['cmd'],
                key: `${index + 1}` as Keyboard.KeyEquivalent,
              }}
              alternate={
                <MenuBarExtra.Item
                  icon={getFavicon(bookmark.url)}
                  title={`View ${bookmark.title}`}
                  onAction={() =>
                    open(urlJoin(prefs.otterBasePath, 'bookmark', bookmark.id))
                  }
                  subtitle={type}
                />
              }
            />
          )
        })}
      </MenuBarExtra.Section>

      {tags?.length ? (
        <MenuBarExtra.Section title={`Top ${tags.length} tags`}>
          {tags.map(({ tag, count }) => {
            if (!tag) {
              return null
            }
            return (
              <MenuBarExtra.Item
                key={tag}
                icon={Icon.Tag}
                title={tag}
                onAction={() => open(urlJoin(prefs.otterBasePath, 'tag', tag))}
                subtitle={count?.toString() ?? ''}
              />
            )
          })}
        </MenuBarExtra.Section>
      ) : null}

      {metadata?.types ? (
        <MenuBarExtra.Section title="Types">
          {metadata.types?.map(({ type, count }) => {
            if (!type) {
              return null
            }
            return (
              <MenuBarExtra.Item
                key={type}
                icon={Icon.Layers}
                title={formatTitle(type)}
                onAction={() =>
                  open(urlJoin(prefs.otterBasePath, 'type', type))
                }
                subtitle={count?.toString() ?? ''}
              />
            )
          })}
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  )
}
