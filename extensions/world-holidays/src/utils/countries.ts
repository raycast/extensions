import { LocalStorage } from '@raycast/api';
import { getAllCountries } from 'country-locale-map';

export const pinCountry = (country: Country, callback?: () => void) => {
  LocalStorage.setItem(country.code, true).then(() => {
    callback?.();
  });
};

export const unpinCountry = (country: Country, callback?: () => void) => {
  LocalStorage.removeItem(country.code).then(() => {
    callback?.();
  });
};

const getPinnedCountries = async (): Promise<Array<Country['code']>> => {
  const countries = await LocalStorage.allItems<{
    [countryCode: Country['code']]: boolean;
  }>();
  return Object.keys(countries);
};

export const getCountriesLists = async (): Promise<{
  pinned: Array<Country>;
  unpinned: Array<Country>;
}> => {
  const countries = getAllCountries().map((country) => ({
    name: country.name,
    emoji: country.emoji,
    code: country.alpha2,
  }));
  const pinnedCountries = await getPinnedCountries();
  return {
    pinned: countries.filter((country) =>
      pinnedCountries.includes(country.code),
    ),
    unpinned: countries.filter(
      (country) => !pinnedCountries.includes(country.code),
    ),
  };
};
