import React, { useEffect, useState } from "react"
import { Action, ActionPanel, Clipboard, getSelectedText, List, showToast, Toast } from "@raycast/api"
import dayjs from "dayjs"
import * as R from "ramda"

require("dayjs/locale/zh-cn")

dayjs.locale("zh-cn")

const isTimestamp = (value: string) => /\d{10}|\d{13}/.test(String(value))
const isDate = (value: string) => !isNaN(new Date(value) as unknown as number)

const parseDates = (timestamp: string | number = dayjs().valueOf()) => {
  return [
    {
      label: "Now",
      date: dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      label: "Date",
      date: dayjs(timestamp).format("YYYY-MM-DD"),
    },
    {
      label: "Time",
      date: dayjs(timestamp).format("HH:mm:ss"),
    },
    {
      label: "Unix timestamp",
      date: dayjs(timestamp).valueOf(),
    },
  ]
}

export default function Command() {
  const [timestamp, updateTimestamp] = useState<string>()
  const [dates, updateDates] = useState(parseDates())

  useEffect(() => {
    if (timestamp && (isTimestamp(timestamp) || isDate(timestamp))) {
      const computedTimestamp = isTimestamp(timestamp)
        ? timestamp.length === 10
          ? Number(timestamp + "000")
          : Number(timestamp)
        : timestamp
      updateDates(parseDates(computedTimestamp))
    }
  }, [timestamp])

  useEffect(() => {
    ;(async () => {
      try {
        const { text: clipboardText } = await Clipboard.read()
        const selectedText = await getSelectedText()
        const text = R.compose(
          R.defaultTo(""),
          R.find(R.anyPass([isTimestamp, isDate]))
        )([selectedText.trim(), clipboardText.trim()])

        if (text) updateTimestamp(text)
      } catch (error) {}
    })()
  }, [])

  return (
    <List
      searchText={timestamp}
      onSearchTextChange={updateTimestamp}
      searchBarPlaceholder="Please input a unix timestamp or a valid date"
    >
      <List.EmptyView title="Type something to conversion" />
      {dates.map(({ date, label }) => (
        <List.Item
          key={label}
          title={String(date)}
          subtitle={label}
          actions={
            <ActionPanel>
              <Action
                title="Copy"
                onAction={() => {
                  showToast({ title: "Copied", style: Toast.Style.Success, message: `${date}` })
                  return Clipboard.copy(date)
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
