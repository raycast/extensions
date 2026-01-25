import { commonPreferences } from "../utils"
import fetch from "node-fetch"

export const createCollection = async (
  name: string,
  description?: string
): Promise<{ success: boolean; error?: string; collectionId?: string }> => {
  const accessToken = commonPreferences().accessToken
  // Postman API: POST /collections
  const url = "https://api.getpostman.com/collections"

  try {
    // Postman API requires collection in v2.1.0 format with 'info' object
    const collectionData = {
      collection: {
        info: {
          name: name,
          description: description || "",
          schema:
            "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [], // Empty array of items - requests will be added separately
      },
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Api-Key": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(collectionData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Failed to create collection: ${response.status} ${errorText}`,
      }
    }

    const result = (await response.json()) as {
      collection?: { uid?: string; id?: string }
      uid?: string
      id?: string
    }
    // Postman API returns collection with uid field
    const collectionId =
      result.collection?.uid || result.collection?.id || result.uid || result.id

    if (!collectionId) {
      return {
        success: false,
        error: "Collection created but ID not found in response",
      }
    }

    return {
      success: true,
      collectionId: collectionId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
