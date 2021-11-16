import { 
  URLConstants 
} from "@urls"

export const languageURL = (language: string) => {
  const imagesURL = `${URLConstants.baseRawURL}/images`

  return `${imagesURL}/icon-${language}.png`
}
