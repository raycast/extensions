// specs/raycast/spec.md — the prayer-times command. Rendering and platform
// glue only; core computes, the data port supplies.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { bruneiNow, type District } from './vendor/core.js'
import { localStore, rememberDistrict, storedDistrict } from './shared/store.js'
import { loadDay, repository, storeCache, type LoadedDay } from './shared/day.js'
import { resolveSettings, type ExtensionSettings } from './shared/settings.js'
import { buildDayView, dayTitle, type DayView } from './shared/view.js'
import { DISTRICT_LABELS, UI } from './shared/strings.js'
import { WEB_APP_URL } from './shared/constants.js'

const DISTRICTS: readonly District[] = ['bruneiMuara', 'tutong', 'belait']

/** How often the clock re-renders, so "Now"/"Next" follow the real time. */
const CLOCK_TICK_MS = 1_000

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
  // Ticks every second so the current/next markers move while the list is
  // open; the loaded day is reloaded when the Brunei date changes.
  const [now, setNow] = useState(() => bruneiNow())
  // The date the current data was requested for. Deliberately not the returned
  // date: a stale day reports the older date it was fetched for, and comparing
  // that to today would reload every tick while offline.
  const requestedDate = useRef<string | null>(null)

  const strings = UI

  const settings: ExtensionSettings = { ...base, district }

  const load = useCallback(async (force = false) => {
    setLoading(true)
    requestedDate.current = bruneiNow().date
    const result = await loadDay(repository(storeCache(localStore)), force)
    setDay(result)
    setLoading(false)
    return result
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = setInterval(() => {
      const current = bruneiNow()
      setNow(current)
      // The list is open across midnight: the previous day's schedule would
      // otherwise stay on screen until the user reloads by hand.
      if (requestedDate.current && current.date !== requestedDate.current)
        void load()
    }, CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [load])

  const view: DayView | null = day
    ? buildDayView(day, settings, now.seconds)
    : null
  const currentId = view?.rows.find((row) => row.current)?.prayer
  const nextId = view?.rows.find((row) => row.next)?.prayer
  // Keep the focused row stable while the clock ticks; it only follows the
  // current entry when that entry actually changes.
  const selectedId = useMemo(
    () => currentId ?? nextId,
    [currentId, nextId],
  )
  const districtLabel = DISTRICT_LABELS[district]
  const sectionSubtitle = day?.stale
    ? `${districtLabel} · ${strings.offline}`
    : districtLabel

  const reload = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: strings.refreshing,
    })
    const result = await load(true)
    // Report the refresh itself, not what the cache happened to hold.
    if (result?.refreshed) {
      toast.style = Toast.Style.Success
      toast.title = strings.reload
    } else {
      toast.style = Toast.Style.Failure
      toast.title = strings.refreshFailed
    }
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
      selectedItemId={selectedId}
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
              title={DISTRICT_LABELS[entry]}
              value={entry}
            />
          ))}
        </List.Dropdown>
      }
    >
      {view ? (
        <List.Section title={dayTitle(view)} subtitle={sectionSubtitle}>
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
