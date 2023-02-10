export const formatNotionUrl = (url: string) => {
  return url.replace(/^https:\/\//, 'notion://')
}
