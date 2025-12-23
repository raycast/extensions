import { LocalStorage } from "@raycast/api";

const STORAGE_KEYS = {
  PARCELS: "tracked_parcels",
} as const;

export interface StoredParcel {
  trackingNumber: string;
  name?: string;
  destinationCountry?: string;
  addedAt: string;
}

export class StorageService {
  static async getParcels(): Promise<StoredParcel[]> {
    const parcelsJson = await LocalStorage.getItem<string>(STORAGE_KEYS.PARCELS);
    if (!parcelsJson) return [];

    try {
      return JSON.parse(parcelsJson);
    } catch {
      return [];
    }
  }

  static async addParcel(parcel: Omit<StoredParcel, "addedAt">): Promise<void> {
    const parcels = await this.getParcels();
    const newParcel: StoredParcel = {
      ...parcel,
      addedAt: new Date().toISOString(),
    };

    const existingIndex = parcels.findIndex((p) => p.trackingNumber === parcel.trackingNumber);
    if (existingIndex >= 0) {
      parcels[existingIndex] = newParcel;
    } else {
      parcels.push(newParcel);
    }

    await LocalStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
  }

  static async removeParcel(trackingNumber: string): Promise<void> {
    const parcels = await this.getParcels();
    const filtered = parcels.filter((p) => p.trackingNumber !== trackingNumber);
    await LocalStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(filtered));
  }

  static async updateParcel(trackingNumber: string, updates: Partial<StoredParcel>): Promise<void> {
    const parcels = await this.getParcels();
    const index = parcels.findIndex((p) => p.trackingNumber === trackingNumber);

    if (index >= 0) {
      parcels[index] = { ...parcels[index], ...updates };
      await LocalStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
    }
  }

  static async clearAllData(): Promise<void> {
    await LocalStorage.removeItem(STORAGE_KEYS.PARCELS);
  }
}
