import { Action, ActionPanel, Detail, List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { buildExpression, getCollection, Operator } from '../../utils/mysql'
import { FC, useState } from 'react'
import { AsyncState } from '@raycast/utils/dist/types'
import { COLLECTION_NAME, SCHEMA_NAME, TicketDataRow } from '../../constants/ticket-library'
import { Shortcuts } from '../../constants/shortcut'
import { withConfig } from '../../utils/configurationCenter'

export const TicketLibraryCommand: FC = withConfig(({ configurations: { ticketLibraryConnection } }) => {
  const [key, setKey] = useState('')
  const [selectedGroup, setGroup] = useState('')

  const groups = ['PARTS', 'ACCOUNTING', 'WARRANTY', 'WORKSHOP', 'ACCIDENT', 'SALES', 'RWO']

  const { data } = usePromise(
    async (url: string, key: string, group: string) => {
      const collection = await getCollection(url, SCHEMA_NAME, COLLECTION_NAME)
      const operation = Operator.and(
        group === '' ? null : Operator.eq('group', ':group'),
        key === ''
          ? null
          : Operator.or(
              Operator.like('lower(ticket)', ':name'),
              Operator.like('cardName', ':name'),
              Operator.like('problemLabel[*]', ':name')
            )
      )

      const ex = buildExpression(operation)
      const rows = await collection.find(ex).bind('name', `%${key.toLowerCase()}%`).bind('group', group).execute()
      return rows.fetchAll()
    },
    [ticketLibraryConnection, key, selectedGroup]
  ) as AsyncState<TicketDataRow[]>

  const buildMarkdownDocument = (ticketData: TicketDataRow) => {
    return (
      `## ${ticketData.cardName}\n` +
      `${ticketData.cardDescription}\n\n` +
      `**[trello card link](${ticketData.cardShortUrl}), [service now link](${ticketData.serviceNowLink})**\n\n` +
      '**问题标签：**\n\n' +
      `${ticketData.problemLabel ? '- ' + ticketData.problemLabel.join('\n- ') : ''}` +
      '\n\n' +
      '**问题原因：**\n\n' +
      `${ticketData.problemRootCauses ? '- ' + ticketData.problemRootCauses.join('\n- ') : ''}` +
      '\n\n' +
      '**修复方式：**\n\n' +
      `${ticketData.problemRepairMethods ? '- ' + ticketData.problemRepairMethods.join('\n- ') : ''}` +
      '\n'
    )
  }

  const TicketDetail = (props: { ticketRowData: TicketDataRow }) => {
    return (
      <Detail
        markdown={buildMarkdownDocument(props.ticketRowData)}
        actions={
          <ActionPanel title="Open ticket in browser">
            <Action.OpenInBrowser
              title="Open trello card in browser"
              url={props.ticketRowData.cardShortUrl}
              shortcut={Shortcuts.link}
            />
            <Action.OpenInBrowser
              title="Open service now in browser"
              url={props.ticketRowData.serviceNowLink}
              shortcut={Shortcuts.link}
            />
          </ActionPanel>
        }
      />
    )
  }

  return (
    <List
      isShowingDetail
      searchText={key}
      onSearchTextChange={setKey}
      navigationTitle={`Find ${data?.length || 0} Tickets`}
      searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Groups" onChange={setGroup}>
          <List.Dropdown.Item title="All" value="" />
          {groups?.map((t, index) => (
            <List.Dropdown.Item key={index} title={t} value={t} />
          ))}
        </List.Dropdown>
      }
    >
      {data?.map((r, index) => (
        <List.Item
          key={r.ticket + index}
          title={r.cardName}
          subtitle={r.group}
          actions={
            <ActionPanel>
              <Action.Push title="Ticket Detail" target={<TicketDetail ticketRowData={r} />} />
              <Action.OpenInBrowser
                title="Open trello card in browser"
                shortcut={Shortcuts.link}
                url={r.cardShortUrl}
              />
              <Action.OpenInBrowser
                title="Open service now in browser"
                url={r.serviceNowLink}
                shortcut={Shortcuts.link}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={buildMarkdownDocument(r)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ticket" text={r.ticket} />
                  <List.Item.Detail.Metadata.Label title="group" text={r.group} />
                  <List.Item.Detail.Metadata.Label title="status" text={r.cardStatus ? r.cardStatus : '未知'} />
                  <List.Item.Detail.Metadata.Label
                    title="ticket open date"
                    text={r.ticketOpenDate ? r.ticketOpenDate : '未知'}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  )
})
