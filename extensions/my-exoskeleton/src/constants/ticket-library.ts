import { CollectionDocuments } from '@mysql/xdevapi/types/lib/DevAPI/CollectionAdd'

export const SCHEMA_NAME = 'sn-connector-dataset'
export const COLLECTION_NAME = 'trello_sync_data'
interface TicketData {
  group: string
  ticket: string
  cardName: string
  cardLabels: Array<string>
  cardStatus: string
  cardMembers: Array<string>
  cardShortUrl: string
  problemLabel: Array<string>
  serviceNowLink: string
  ticketOpenDate: string
  cardDescription: string
  problemRootCauses: Array<string>
  problemRepairMethods: Array<string>
}

export type TicketDataRow = CollectionDocuments & TicketData
