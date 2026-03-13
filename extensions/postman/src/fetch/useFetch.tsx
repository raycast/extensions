import { useFetch as useRayFetch } from "@raycast/utils"
import { commonPreferences } from "../utils"

enum URLS {
  listCollections = "https://api.getpostman.com/collections",
  getCollection = "https://api.getpostman.com/collections/",
}

export const useFetch = (url: keyof typeof URLS, params?: string) => {
  const accessToken = commonPreferences().accessToken
  const res = useRayFetch(URLS[url] + (params ?? ""), {
    headers: { "X-Api-Key": accessToken },
  })

  return res
}
