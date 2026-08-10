import Fuse from 'fuse.js'

export function autocomplete(pattern: string, list: any[], options: any) {
  const fuse = new Fuse(list, options)
  return fuse.search(pattern)
}
