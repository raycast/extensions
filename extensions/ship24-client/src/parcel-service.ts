import { Ship24ApiClient } from "./api";
import { StorageService, StoredParcel } from "./storage";
import { getPreferences } from "./preferences";
import { Ship24Tracker, ErrorObject } from "./types";

export interface ParcelWithStatus extends StoredParcel {
  status?: Ship24Tracker | null;
  error?: string;
}

export class ParcelService {
  private static getApiClient(): Ship24ApiClient {
    const { apiKey } = getPreferences();
    return new Ship24ApiClient(apiKey);
  }

  static async getAllParcelsWithStatus(): Promise<ParcelWithStatus[]> {
    const parcels = await StorageService.getParcels();
    if (parcels.length === 0) {
      return [];
    }

    const apiClient = this.getApiClient();

    // Parallel API calls using Promise.allSettled
    const trackingPromises = parcels.map((parcel) =>
      apiClient
        .searchTrackingResults(parcel.trackingNumber)
        .then((tracking) => ({ parcel, tracking, error: null }))
        .catch((error) => ({ parcel, tracking: null, error })),
    );

    const results = await Promise.allSettled(trackingPromises);

    return results.map((result, index) => {
      const parcel = parcels[index];

      if (result.status === "fulfilled") {
        const { tracking, error } = result.value;

        if (error) {
          let errorMessage = "Unknown error";

          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === "object" && error !== null) {
            const errorObj = error as ErrorObject;
            if (errorObj.message) {
              errorMessage = errorObj.message;
            } else {
              errorMessage = JSON.stringify(error, null, 2);
            }
          }

          return {
            ...parcel,
            error: errorMessage,
          };
        }

        return {
          ...parcel,
          status: tracking,
        };
      }

      // Promise was rejected (shouldn't happen with our error handling above)
      return {
        ...parcel,
        error: "Request failed",
      };
    });
  }

  static async getParcelStatus(trackingNumber: string): Promise<ParcelWithStatus | null> {
    const parcels = await StorageService.getParcels();
    const parcel = parcels.find((p) => p.trackingNumber === trackingNumber);

    if (!parcel) {
      return null;
    }

    const apiClient = this.getApiClient();

    try {
      const tracking = await apiClient.searchTrackingResults(parcel.trackingNumber);

      return {
        ...parcel,
        status: tracking,
      };
    } catch (error) {
      let errorMessage = "Unknown error";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        const errorObj = error as ErrorObject;
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else {
          errorMessage = JSON.stringify(error, null, 2);
        }
      }

      return {
        ...parcel,
        error: errorMessage,
      };
    }
  }
}
