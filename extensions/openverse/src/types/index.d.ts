/* Raycast data */

interface LocalStorageData {
  accessToken: string
  expiresAt: number
}

/**
 * app specific data stored in the Raycast preferences
 */
interface PreferenceData {
  clientId: string
  clientSecret: string
}

/* App state */

interface SearchState {
  isLoading: boolean
  results: Image[]
}

/* API requests */

type Use = "all" | "commercial" | "modification"

/* API responses */

/**
 * the response from the API when requesting an access token using the client
 * ID and client secret
 */
interface TokenResponse {
  access_token: string
  expires_in: number
}

/**
 * the response from the API when searching for images
 */
interface ImageResponse {
  result_count: number
  page_count: number
  page_size: number
  page: number
  results: Image[]
}

/**
 * a single image result returned by the API
 */
interface Image {
  id: string

  url: string
  attribution: string

  // Title
  title: string
  foreign_landing_url: string

  // Creator
  creator: string
  creator_url: string

  // License
  license: string
  license_version: string
  license_url: string

  // Dimensions
  height: number
  width: number

  // Tags
  tags: Tag[]
}

/**
 * a single tag associated with an image
 */
interface Tag {
  name: string
}
