import { Action, ActionPanel, List } from "@raycast/api"
import { useState } from "react"
import Nzh from "nzh"

const nzhcn = Nzh.cn
const toChineseLowercase = (text: number) => nzhcn.encodeS(text)
const toChineseCapitalizated = (text: number) => nzhcn.encodeB(text)
const toScientificCountingMethod = (text: number) => nzhcn.encodeS(text)
const toChineseCapitalizatedAmount = (text: number) => nzhcn.toMoney(text)

export default function Command() {
  const [ChineseLowercase, setChineseLowercase] =
    useState<string>("中文小写...")
  const [ChineseCapitalizated, setChineseCapitalizated] =
    useState<string>("中文大写...")
  const [ScientificCountingMethod, setScientificCountingMethod] =
    useState<string>("科学记数法字符串...")
  const [ChineseCapitalizatedAmount, setChineseCapitalizatedAmount] =
    useState<string>("中文金额...")
  const handleOnTextChange = (value: string) => {
    const input = Number(value)
    if (!isNaN(input)) {
      setChineseLowercase(toChineseLowercase(input))
      setChineseCapitalizated(toChineseCapitalizated(input))
      setScientificCountingMethod(toScientificCountingMethod(input))
      setChineseCapitalizatedAmount(toChineseCapitalizatedAmount(input))
    }
  }

  return (
    <List
      onSearchTextChange={handleOnTextChange}
      enableFiltering={false}
      navigationTitle="数字转中文（大写，小写）数字，金额"
      searchBarPlaceholder="Input Numbers..."
    >
      <List.Section title="转中文小写">
        <List.Item
          title={ChineseLowercase}
          actions={
            <ActionPanel title="Copy">
              <Action.CopyToClipboard
                title="Copy to clipboard"
                content={ChineseLowercase}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="转中文大写">
        <List.Item
          title={ChineseCapitalizated}
          actions={
            <ActionPanel title="Copy">
              <Action.CopyToClipboard
                title="Copy to clipboard"
                content={ChineseCapitalizated}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="科学记数法字符串">
        <List.Item
          title={ScientificCountingMethod}
          actions={
            <ActionPanel title="Copy">
              <Action.CopyToClipboard
                title="Copy to clipboard"
                content={ScientificCountingMethod}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="转中文金额">
        <List.Item
          title={ChineseCapitalizatedAmount}
          actions={
            <ActionPanel title="Copy">
              <Action.CopyToClipboard
                title="Copy to clipboard"
                content={ChineseCapitalizatedAmount}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  )
}
