import { countries } from "../data/countries";

const isCountryCode = (countryCode: string): countryCode is keyof typeof countries => {
  return countryCode.toUpperCase() in countries;
};

export const getCountryInfo = (countryCode: string) => {
  const isValidCountryCode = isCountryCode(countryCode);

  if (isValidCountryCode) {
    return countries[countryCode];
  } else {
    console.log(`Country code "${countryCode}" not found.`);
    return { emoji: "🏳️", name: "Unknown" };
  }
};
