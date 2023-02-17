import { useEffect, useState } from 'react';
import { getCountriesLists, pinCountry, unpinCountry } from '../utils/countries';

interface UseCountriesHookReturnType {
  pinnedCountries: Array<Country>;
  unpinnedCountries: Array<Country>;
  pinCountry: (country: Country) => void;
  unpinCountry: (country: Country) => void;
}

export const useCountries = (
  onCountryPinned?: (country: Country) => void,
): UseCountriesHookReturnType => {
  const [pinnedCountries, setPinnedCountries] = useState<Array<Country>>([]);
  const [unpinnedCountries, setUnpinnedCountries] = useState<Array<Country>>(
    [],
  );

  const loadCountriesLists = () => {
    getCountriesLists().then((lists) => {
      setPinnedCountries(lists.pinned);
      setUnpinnedCountries(lists.unpinned);
    });
  };

  const internalPinCountry = (country: Country) => {
    pinCountry(country, () => {
      loadCountriesLists();
      onCountryPinned?.(country);
    });
  };

  const internalUnpinCountry = (country: Country) => {
    unpinCountry(country, loadCountriesLists);
  };

  useEffect(() => {
    loadCountriesLists();
  }, []);

  return {
    pinnedCountries,
    unpinnedCountries,
    pinCountry: internalPinCountry,
    unpinCountry: internalUnpinCountry,
  };
};
