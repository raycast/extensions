import { useState, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { Country } from "@/types";

const useStoredCountry = () => {
  const [countryCode, setCountryCode] = useCachedState<string | null>("cached_country_code", null);

  const changeCountryCode = async (locale: string) => {
    if (locale !== "") {
      setCountryCode(locale);
    }
  };

  return { countryCode, changeCountryCode };
};

export const useCountries = () => {
  const { countryCode, changeCountryCode } = useStoredCountry();
  const [withEmpty, setWithEmpty] = useState(true);
  const countries = useMemo(() => {
    const _countries = Object.entries(Country).sort((a, b) => a[1].localeCompare(b[1]));
    if (withEmpty) {
      _countries.unshift(["", "Select a country" as Country]);
    }
    return _countries;
  }, [withEmpty]);

  const onCountryChange = async (locale: string) => {
    if (locale !== "") {
      setWithEmpty(false);
      changeCountryCode(locale);
    }
  };

  return { onCountryChange, countryCode, countries };
};
