// specs/raycast/spec.md — the prayer-times command. Rendering and platform
// glue only; core computes, the data port supplies.
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from '@raycast/api'
import { MORA_PAGE_URL } from './vendor/source.js'
import type { District } from './vendor/core.js'
import { localStore, rememberDistrict, storedDistrict } from './shared/store.js'
import { loadDay, repository, storeCache, type LoadedDay } from './shared/day.js'
import { t } from './shared/i18n.js'
import { resolveSettings, type ExtensionSettings } from './shared/settings.js'
import { buildDayView, dayTitle, type DayView } from './shared/view.js'
import { WEB_APP_URL } from './shared/constants.js'

const DISTRICTS: readonly District[] = ['bruneiMuara', 'tutong', 'belait']

interface Preferences {
  locale?: string
  timeFormat?: string
  district?: string
}

function stored(base: District): District {
  const value = storedDistrict()
  return DISTRICTS.includes(value as District) ? (value as District) : base
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>()
  const base = useMemo(() => resolveSettings(preferences), [preferences])
  const [district, setDistrict] = useState<District>(() =>
    stored(base.district),
  )
  const [day, setDay] = useState<LoadedDay | null>(null)
  const [loading, setLoading] = useState(true)
  const strings = useMemo(() => {
    const s = (key: string) => t(base.locale, key)
    return {
      title: s('meta.title'),
      district: s('district.label'),
      reload: s('action.reloadData'),
      openApp: s('extension.openApp'),
      source: s('source.label'),
      sourceName: s('source.name'),
      settings: s('settings.title'),
      loading: s('state.loading'),
      unavailable: s('state.unavailable'),
      refreshing: s('state.refreshing'),
      retry: s('action.retry'),
      next: s('extension.pageHeaderLabel'),
      now: s('state.current'),
      offline: s('state.offline'),
    }
  }, [base.locale])

  const settings: ExtensionSettings = { ...base, district }

  const load = useCallback(async (force = false) => {
    setLoading(true)
    const result = await loadDay(repository(storeCache(localStore)), force)
    setDay(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const view: DayView | null = day ? buildDayView(day, settings) : null
  const currentId = view?.rows.find((row) => row.current)?.prayer
  const nextId = view?.rows.find((row) => row.next)?.prayer
  const districtLabel = t(base.locale, `district.${district}`)
  const sectionSubtitle = day?.stale
    ? `${districtLabel} · ${strings.offline}`
    : districtLabel

  const reload = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: strings.refreshing,
    })
    await load(true)
    toast.style = Toast.Style.Success
    toast.title = strings.reload
  }

  const actions = (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={strings.reload}
          icon={Icon.ArrowClockwise}
          onAction={reload}
        />
        <Action.OpenInBrowser
          title={strings.openApp}
          icon={Icon.Globe}
          url={WEB_APP_URL}
        />
        <Action.OpenInBrowser
          title={strings.source}
          icon={Icon.Book}
          url={MORA_PAGE_URL}
        />
        <Action
          title={strings.settings}
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  )

  return (
    <List
      isLoading={loading}
      navigationTitle={strings.title}
      selectedItemId={currentId ?? nextId}
      searchBarAccessory={
        <List.Dropdown
          tooltip={strings.district}
          value={district}
          onChange={(value) => {
            const next = value as District
            setDistrict(next)
            rememberDistrict(next)
          }}
        >
          {DISTRICTS.map((entry) => (
            <List.Dropdown.Item
              key={entry}
              title={t(base.locale, `district.${entry}`)}
              value={entry}
            />
          ))}
        </List.Dropdown>
      }
    >
      {view ? (
        <List.Section
          title={dayTitle(view)}
          subtitle={sectionSubtitle}
        >
          {view.rows.map((row) => (
            <List.Item
              key={row.prayer}
              id={row.prayer}
              icon={
                row.current
                  ? { source: Icon.Clock, tintColor: Color.Green }
                  : Icon.Calendar
              }
              title={row.label}
              subtitle={row.current ? strings.now : undefined}
              accessories={[
                ...(row.next
                  ? [{ tag: { value: strings.next, color: Color.Green } }]
                  : []),
                {
                  text: {
                    value: row.time,
                    color: row.current ? Color.Green : Color.PrimaryText,
                  },
                },
              ]}
              actions={actions}
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={loading ? Icon.Clock : Icon.Warning}
          title={loading ? strings.loading : strings.unavailable}
          description={loading ? undefined : strings.sourceName}
          actions={
            <ActionPanel>
              {!loading && (
                <Action
                  title={strings.retry}
                  icon={Icon.ArrowClockwise}
                  onAction={() => void load(true)}
                />
              )}
              <Action
                title={strings.settings}
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  )
}
