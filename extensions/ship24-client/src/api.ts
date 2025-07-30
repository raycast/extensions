import { Ship24TrackingRequest, Ship24TrackingResponse, Ship24Tracker, ApiError, ErrorObject } from "./types";

const BASE_URL = "https://api.ship24.com";

export class Ship24ApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private selectBestTracking(trackings: Ship24Tracker[]): Ship24Tracker {
    if (trackings.length === 1) {
      return trackings[0];
    }

    // Find tracking that is not delivered and not exception
    const activeTracking = trackings.find((tracking) => {
      const shipment = tracking.shipment;
      const statusCategory = shipment?.statusCategory?.toLowerCase();
      const statusCode = shipment?.statusCode?.toLowerCase();
      const statusMilestone = shipment?.statusMilestone?.toLowerCase();

      return statusCategory !== "exception" && statusCode !== "delivery_delivered" && statusMilestone !== "delivered";
    });

    return activeTracking || trackings[0];
  }

  async trackShipment(request: Ship24TrackingRequest): Promise<Ship24TrackingResponse> {
    try {
      const response = await global.fetch(`${BASE_URL}/public/v1/trackers/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Ship24 API request failed: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.code === "quota_limit_reached") {
            errorMessage = "Quota limit reached. Please check your Ship24 API plan or try again later.";
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If parsing fails, use the original error text
          if (errorText) {
            errorMessage += ` - ${errorText}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!this.isValidTrackingResponse(data)) {
        throw new Error("Invalid response format from Ship24 API");
      }

      // Select best tracking and modify response
      if (data.data.trackings.length > 0) {
        const bestTracking = this.selectBestTracking(data.data.trackings);
        data.data.trackings = [bestTracking];
      }

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchTrackingResults(trackingNumber: string): Promise<Ship24Tracker | null> {
    try {
      const response = await global.fetch(`${BASE_URL}/public/v1/trackers/search/${trackingNumber}/results`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Ship24 API request failed: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          if (errorData.code === "quota_limit_reached") {
            errorMessage = "Quota limit reached. Please check your Ship24 API plan or try again later.";
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If parsing fails, use the original error text
          if (errorText) {
            errorMessage += ` - ${errorText}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!this.isValidTrackingResponse(data)) {
        throw new Error("Invalid response format from Ship24 API");
      }

      // Select best tracking and return it directly
      if (data.data.trackings.length > 0) {
        return this.selectBestTracking(data.data.trackings);
      }

      return null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private isValidTrackingResponse(data: unknown): data is Ship24TrackingResponse {
    if (typeof data !== "object" || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;
    if (!("data" in obj) || typeof obj.data !== "object" || obj.data === null) {
      return false;
    }

    const dataObj = obj.data as Record<string, unknown>;
    return "trackings" in dataObj && Array.isArray(dataObj.trackings);
  }

  private handleError(error: unknown): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
        details: error,
      };
    }

    if (typeof error === "object" && error !== null) {
      const errorObj = error as ErrorObject;
      if (errorObj.message) {
        return {
          message: errorObj.message,
          details: error,
        };
      }
      if (errorObj.error) {
        return {
          message: errorObj.error,
          details: error,
        };
      }
    }

    return {
      message: `Ship24 API error: ${JSON.stringify(error, null, 2)}`,
      details: error,
    };
  }
}
