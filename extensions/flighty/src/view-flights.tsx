import {List, ActionPanel, Action, Icon, Color} from '@raycast/api'
import {useState} from 'react'
import dayjs, {type Dayjs} from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {getAllYears, useFlights} from './use-flights'

dayjs.extend(utc)
dayjs.extend(timezone)

// date formats
const timeFormat = 'h:mma'

export default function () {
    const {isLoading, error, data: allFlights} = useFlights()
    const allYears = getAllYears(allFlights)
    const [filter, setFilter] = useState<{type: 'future'} | {type: 'all'} | {type: 'year'; year: string}>({type: 'future'})

    const filteredFlights = allFlights?.filter((flight) => {
        if (filter.type === 'future') return dayjs.unix(flight.depTimeOriginal).isAfter(dayjs())
        if (filter.type === 'all') return true
        return dayjs.unix(flight.depTimeOriginal).year().toString() === filter.year
    })

    if (filter.type === 'future') filteredFlights?.reverse()

    return (
        <List
            isLoading={isLoading}
            navigationTitle="Flights"
            isShowingDetail={error === undefined}
            searchBarAccessory={
                <List.Dropdown
                    tooltip="Dropdown With Items"
                    onChange={(value) => {
                        if (value === 'future') return setFilter({type: 'future'})
                        if (value === 'all') return setFilter({type: 'all'})
                        return setFilter({type: 'year', year: value})
                    }}
                >
                    <List.Dropdown.Section>
                        <List.Dropdown.Item title="Upcoming" value="future" />
                        <List.Dropdown.Item title="All" value="all" />
                    </List.Dropdown.Section>

                    <List.Dropdown.Section title="Past Flights">
                        {allYears?.map((year) => <List.Dropdown.Item key={year} title={year.toString()} value={year.toString()} />)}
                    </List.Dropdown.Section>
                </List.Dropdown>
            }
        >
            {filteredFlights?.map((flight) => {
                const link = `https://live.flighty.app/${flight.id}`

                const depTimeOriginal = dayjs.unix(flight.depTimeOriginal).tz(flight.depTz)
                const depTimeActual = (() => {
                    if (flight.depTimeActual !== null) return dayjs.unix(flight.depTimeActual).tz(flight.depTz)
                    if (flight.depTimeEstimated !== null) return dayjs.unix(flight.depTimeEstimated).tz(flight.depTz)
                    return null
                })()

                const arrTimeOriginal = flight.arrTimeOriginal ? dayjs.unix(flight.arrTimeOriginal).tz(flight.arrTz) : null
                const arrTimeActual = (() => {
                    if (flight.arrTimeActual !== null) return dayjs.unix(flight.arrTimeActual).tz(flight.arrTz)
                    if (flight.arrTimeEstimated !== null) return dayjs.unix(flight.arrTimeEstimated).tz(flight.arrTz)
                    return null
                })()

                const depDate = depTimeOriginal.format(depTimeOriginal.year() === dayjs().year() ? 'ddd, D MMM' : 'ddd, D MMM YYYY')

                const durationOriginal = arrTimeOriginal ? arrTimeOriginal.diff(depTimeOriginal, 'minute') : null
                const durationActual = depTimeActual && arrTimeActual ? arrTimeActual.diff(depTimeActual, 'minute') : null

                return (
                    <List.Item
                        key={flight.id}
                        icon={{
                            source: {
                                light: `https://live.flighty.app/content/airlines:light_${flight.airlineIcao.toLowerCase()}.svg`,
                                dark: `https://live.flighty.app/content/airlines:dark_${flight.airlineIcao.toLowerCase()}.svg`,
                            },
                            fallback: Icon.Airplane,
                        }}
                        title={`${flight.airlineIata} ${flight.number}`}
                        accessories={[{text: depDate}]}
                        keywords={[
                            flight.number,
                            flight.airlineIata,
                            flight.airlineIcao,
                            flight.airlineName,

                            flight.depAirportIata,
                            flight.depCity,
                            flight.arrAirportIata,
                            flight.arrCity,

                            flight.aircraftIata,
                            flight.aircraftIcao,
                            flight.aircraftName,
                            flight.aircraftTailNumber,
                        ].filter((s) => s !== null)}
                        actions={
                            <ActionPanel title="Flight">
                                <Action.OpenInBrowser title="Open in Flighty" url={link} />
                                <Action.CopyToClipboard title="Copy Link" content={link} />
                            </ActionPanel>
                        }
                        detail={
                            <List.Item.Detail
                                metadata={
                                    <List.Item.Detail.Metadata>
                                        <List.Item.Detail.Metadata.Label title="Airline" text={flight.airlineName} />
                                        <List.Item.Detail.Metadata.Label title="Flight Number" text={`${flight.airlineIata} ${flight.number}`} />

                                        <List.Item.Detail.Metadata.Label title="Date" text={depDate} />

                                        <List.Item.Detail.Metadata.Label title="From" text={`${flight.depCity} (${flight.depAirportIata})`} />
                                        <List.Item.Detail.Metadata.Label title="To" text={`${flight.arrCity} (${flight.arrAirportIata})`} />

                                        <List.Item.Detail.Metadata.Separator />

                                        <List.Item.Detail.Metadata.Label title="Departure - Scheduled" text={depTimeOriginal.format(timeFormat)} />
                                        <List.Item.Detail.Metadata.Label
                                            title="Departure - Actual"
                                            text={(() => {
                                                if (depTimeActual === null) return '-'
                                                return {
                                                    value: formatRelativeTime(depTimeOriginal, depTimeActual),
                                                    color: depTimeActual > depTimeOriginal ? Color.Red : Color.Green,
                                                }
                                            })()}
                                        />

                                        <List.Item.Detail.Metadata.Label
                                            title="Arrival - Scheduled"
                                            text={(() => {
                                                if (arrTimeOriginal === null) return '-'
                                                return formatRelativeTime(depTimeOriginal, arrTimeOriginal)
                                            })()}
                                        />
                                        <List.Item.Detail.Metadata.Label
                                            title="Arrival - Actual"
                                            text={(() => {
                                                if (arrTimeActual === null) return '-'
                                                if (arrTimeOriginal === null) return formatRelativeTime(depTimeOriginal, arrTimeActual)
                                                return {
                                                    value: formatRelativeTime(depTimeOriginal, arrTimeActual),
                                                    color: arrTimeActual > arrTimeOriginal ? Color.Red : Color.Green,
                                                }
                                            })()}
                                        />

                                        <List.Item.Detail.Metadata.Label
                                            title="Duration - Scheduled"
                                            text={(() => {
                                                if (durationOriginal === null) return '-'
                                                return `${Math.floor(durationOriginal / 60)}h ${durationOriginal % 60}m`
                                            })()}
                                        />
                                        <List.Item.Detail.Metadata.Label
                                            title="Duration - Actual"
                                            text={(() => {
                                                if (durationActual === null) return '-'
                                                if (durationOriginal === null) return `${Math.floor(durationActual / 60)}h ${durationActual % 60}m`
                                                return {
                                                    value: `${Math.floor(durationActual / 60)}h ${durationActual % 60}m`,
                                                    color: durationActual > durationOriginal ? Color.Red : Color.Green,
                                                }
                                            })()}
                                        />

                                        <List.Item.Detail.Metadata.Separator />

                                        <List.Item.Detail.Metadata.Label title="Aircraft" text={flight.aircraftName ?? undefined} />
                                        <List.Item.Detail.Metadata.Label title="Distance" text={`${flight.distance} km`} />
                                    </List.Item.Detail.Metadata>
                                }
                            />
                        }
                    />
                )
            })}
            {error && <List.EmptyView icon={Icon.Warning} description={error.message} />}
        </List>
    )
}

function formatRelativeTime(original: Dayjs, final: Dayjs) {
    const diff = final.startOf('day').diff(original.startOf('day'), 'day')
    if (diff === 0) return final.format(timeFormat)
    return `${final.format(timeFormat)} (+${diff})`
}
