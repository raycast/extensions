import { URLConstants } from "@network"

export const languageURL = (language: string) => {
  const imagesURL = `${URLConstants.baseRawURL}/images`

  return `${imagesURL}/icon-${language}.png`
}
