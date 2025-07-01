import { Ship24ApiClient } from "./api";
import { StorageService, StoredParcel } from "./storage";
import { getPreferences } from "./preferences";
import { Ship24Tracker } from "./types";
import { getErrorMessage } from "./utils/error-handler";

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
          return {
            ...parcel,
            error: getErrorMessage(error),
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
      return {
        ...parcel,
        error: getErrorMessage(error),
      };
    }
  }

  static async refreshSingleParcel(trackingNumber: string): Promise<ParcelWithStatus | null> {
    return this.getParcelStatus(trackingNumber);
  }
}
