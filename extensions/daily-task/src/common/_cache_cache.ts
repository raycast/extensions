import { Cache } from "@raycast/api"
import { taskListType } from "./types"

const cache = new Cache()

if (!cache.has('data')) {
  cache.set('data', JSON.stringify([]))
}
if (!cache.has('activeId')) {
  cache.set('activeId', '')
}

export function getData():taskListType {
  if (cache.has('data')) {
    let d: taskListType = JSON.parse(cache.get('data') || '[]')
    return d
  } else {
    return []
  }
}

export function saveData(d:taskListType) {
  cache.set('data', JSON.stringify(d))
}

export function getActiveId(): string {
  if (cache.has('activeId')) {
    return cache.get('activeId') || ''
  } else {
    return ''
  }
}

export function saveActiveId(id: string) {
  cache.set('activeId', id)
}