import { loadZones, Zone } from './lib/zones'
import { useEffect, useState } from 'react'
import { useCachedState } from '@raycast/utils'
import { loadTodaySolat, PrayerTime, PrayerTimeItem } from './lib/prayer-times'
import { Color, List } from '@raycast/api'

function Zones(props: { onChange: (z: Zone) => void }) {
  const [isLoading, setLoading] = useState(true)
  const [zones, setZones] = useCachedState<Zone[]>('zones')

  useEffect(() => {
    async function load() {
      setZones(await loadZones())
      setLoading(false)
    }

    // noinspection JSIgnoredPromiseFromCall
    load()
  })
  return (
    <List.Dropdown
      isLoading={isLoading}
      tooltip="Select Zone"
      storeValue={true}
      onChange={(newId) => {
        props.onChange(zones?.find((z) => z.id == newId) || { id: newId, name: '', state: '' })
      }}
    >
      <List.Dropdown.Section title="Zones">
        {zones?.map((z) => (
          <List.Dropdown.Item key={z.id} title={z.name} value={z.id} keywords={[z.state, z.id]} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  )
}

function PrayerItem(props: { item: PrayerTimeItem }) {
  const {
    item: { isCurrent, label, value, different, isNext },
  } = props

  function getTag() {
    return isCurrent
      ? { value: 'Current', color: Color.Green }
      : isNext
      ? { value: different }
      : undefined
  }

  return (
    <List.Item
      icon="🕌"
      key={label}
      title={label}
      subtitle={value}
      accessories={[{ tag: getTag() }]}
    />
  )
}

function prayerTimes() {
  const [isLoading, setLoading] = useState(true)
  const [prayerTime, setPrayerTime] = useCachedState<PrayerTime>('prayer')

  async function onZoneChange(z: Zone) {
    setLoading(true)
    // console.log('change to', z)
    setPrayerTime(await loadTodaySolat(z.id))
    setLoading(false)
  }

  return (
    <List searchBarAccessory={<Zones onChange={onZoneChange} />} isLoading={isLoading}>
      {prayerTime?.items?.map((p) => (
        <PrayerItem item={p} />
      ))}
    </List>
  )
}

// noinspection JSUnusedGlobalSymbols
export default function Command() {
  return prayerTimes()
}
