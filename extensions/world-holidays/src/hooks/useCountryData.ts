import { useEffect } from 'react';
import { getDataFromCache, saveDataInCache } from '../utils/cache';
import { useRequest } from './useRequest';

interface UseCountryDataHookType {
  holidays: Array<Holiday>;
  photo?: Photo | null;
  loading: boolean;
  error?: string | Error | null;
}

export const useCountryData = (country: Country): UseCountryDataHookType => {
  const thisYear = new Date().getFullYear();
  const { code: countryCode, name: countryName } = country;
  const CACHED_HOLIDAYS_KEY = `${countryCode}-holidays`;
  const CACHED_PHOTO_KEY = `${countryCode}-photo`;

  const cachedHolidays = getDataFromCache<Array<Holiday>>(CACHED_HOLIDAYS_KEY);
  const cachedPhoto = getDataFromCache<Photo>(CACHED_PHOTO_KEY);

  const { data, loading, error } = useRequest<HolidaysResponse>(
    `https://world-holidays.info/api/holidays?lang=en&country=${countryCode}&year=${thisYear}`,
  );

  const { data: photoData, loading: loadingPhoto } = useRequest<Photo>(
    `https://world-holidays.info/api/photo?country=${countryName}`,
  );

  useEffect(() => {
    if (data && data.count) saveDataInCache(CACHED_HOLIDAYS_KEY, data);
  }, [data]);

  useEffect(() => {
    if (photoData) saveDataInCache(CACHED_PHOTO_KEY, photoData);
  }, [photoData]);

  const holidays = data?.holidays || cachedHolidays || [];
  const photo = photoData || cachedPhoto;
  const dataLoading = loading || loadingPhoto;

  return {
    holidays,
    photo,
    loading: dataLoading && (!holidays || !holidays.length),
    error,
  };
};
