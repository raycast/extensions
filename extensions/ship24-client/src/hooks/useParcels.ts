import { useState, useEffect, useCallback } from "react";
import { ParcelService, ParcelWithStatus } from "../parcel-service";
import { handleApiError } from "../utils/error-handler";

interface UseParcelsResult {
  parcels: ParcelWithStatus[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useParcels(): UseParcelsResult {
  const [parcels, setParcels] = useState<ParcelWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParcels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await ParcelService.getAllParcelsWithStatus();
      setParcels(result);
    } catch (err) {
      handleApiError(err, "Failed to fetch parcels");
      setError("Failed to fetch parcels");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  return {
    parcels,
    isLoading,
    error,
    refetch: fetchParcels,
  };
}

interface UseParcelResult {
  parcel: ParcelWithStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useParcel(trackingNumber: string): UseParcelResult {
  const [parcel, setParcel] = useState<ParcelWithStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParcel = useCallback(async () => {
    if (!trackingNumber) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await ParcelService.getParcelStatus(trackingNumber);
      setParcel(result);
    } catch (err) {
      handleApiError(err, "Failed to fetch parcel");
      setError("Failed to fetch parcel");
    } finally {
      setIsLoading(false);
    }
  }, [trackingNumber]);

  useEffect(() => {
    fetchParcel();
  }, [fetchParcel]);

  return {
    parcel,
    isLoading,
    error,
    refetch: fetchParcel,
  };
}
