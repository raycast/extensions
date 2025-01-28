import { LocalStorage } from '@raycast/api'
import { RegisterBookmarkForm } from '../types'

// 로컬스토리지에 북마크를 추가한다.
export const addBookmark = async (form: RegisterBookmarkForm) => {
  const bookmarkList = (await LocalStorage.getItem<string>('bookmarks'))
    ? (JSON.parse((await LocalStorage.getItem<string>('bookmarks')) || '[]') as RegisterBookmarkForm[])
    : []

  bookmarkList.push(form)
  LocalStorage.setItem('bookmarks', JSON.stringify(bookmarkList))
}

// 로컬스토리지에 저장된 북마크 리스트를 가지고온다.
export const getBookmarks = async () => {
  return (await LocalStorage.getItem<string>('bookmarks'))
    ? (JSON.parse((await LocalStorage.getItem<string>('bookmarks')) || '[]') as RegisterBookmarkForm[])
    : []
}

export const flushBookmarks = async () => {
  await LocalStorage.removeItem('bookmarks')
}
