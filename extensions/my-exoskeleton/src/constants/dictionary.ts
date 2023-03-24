import { CollectionDocuments } from '@mysql/xdevapi/types/lib/DevAPI/CollectionAdd'

export const SCHEMA_NAME = 'exoskeleton'
export const COLLECTION_NAME = 'dict'
export const CONFIG_COLLECTION_NAME = 'config'

export interface DictionaryRecord {
  英文全称: string
  缩写: string
  中文名称: string
  类型: string
  相关squad: string
  说明: string
  备注: string
}

interface DR {
  enName: string
  abbr: string
  cnName: string
  type: string
  squad: string
  description: string
  remark: string
}

export type DictionaryRow = CollectionDocuments & DR

const COLUMNE_MAP = {
  英文全称: 'enName',
  缩写: 'abbr',
  中文名称: 'cnName',
  类型: 'type',
  相关squad: 'squad',
  说明: 'description',
  备注: 'remark'
}

export const toDBRecord = (record: DictionaryRecord): DictionaryRow =>
  Object.entries(COLUMNE_MAP).reduce(
    (v, [key, value]) => ({ ...v, [value]: record[key as keyof DictionaryRecord] }),
    {}
  ) as DictionaryRow

export interface DictionaryPreference {
  dictionaryUrl: string
}

interface TR {
  configName: string
  trelloBaseUrl: string
  apiKey: string
  apiToken: string
  boardId: string
  defaultListCardName: string
}

export type TrelloConfig = CollectionDocuments & TR

export interface RequestDictIssue {
  dictName: string
  context: string
  yourName: string
}

export interface TrelloListCard {
  id: string
  name: string
  idBoard: string
}

export interface CreateTrelloCard {
  name: string
  desc: string
  idList: string
}
