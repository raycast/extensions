import { URL } from 'url'
export const simpleUrl = (url: string): string => {
  const theUrl = new URL(url)
  return theUrl.hostname.replace('www.', '')
}
