export const formatNotionUrl = (url: string) => {
  return url.replace(/^https:\/\/(?:www\.)?notion\.so\/(?:native\/)?/i, "notion://")
}
