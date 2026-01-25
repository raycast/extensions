import { commonPreferences } from "../utils"
import fetch from "node-fetch"
import { RequestDetailsType } from "../types"

export const updateRequest = async (
  collectionId: string,
  requestId: string,
  requestData: Partial<RequestDetailsType>
): Promise<{ success: boolean; error?: string }> => {
  const accessToken = commonPreferences().accessToken
  const url = `https://api.getpostman.com/collections/${collectionId}/requests/${requestId}`

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "X-Api-Key": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Failed to update request: ${response.status} ${errorText}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
