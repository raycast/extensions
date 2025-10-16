import { environment } from "@raycast/api";
import type { Country } from "@/types";

const useExtraFields = (country: Country, countryList: Country[]) => {
  let phone: string | null = null;
  const keywords = [country.cca2, country.cca3];
  if (country.idd.root && country.idd.suffixes.length) {
    phone = country.idd.suffixes
      .map((suffix) => {
        keywords.push(`${country.idd.root}${suffix}`, `${country.idd.root.replace("+", "")}${suffix}`);
        return `${country.idd.root}${suffix}`;
      })
      .join(", ");
  }

  const markdownCoat = country.coatOfArms.png
    ? country.coatOfArms.png
    : `file://${environment.assetsPath}/no-image@${environment.appearance}.png`;

  if (country.capital) {
    country.capital.forEach((capital) => {
      keywords.push(capital);
    });
  }

  if (country.tld?.length) {
    keywords.push(...country.tld);
  }

  if (country.translations) {
    Object.values(country.translations).forEach((translation) => {
      keywords.push(translation.common, translation.official);
    });
  }

  if (country.altSpellings) {
    keywords.push(...country.altSpellings);
  }

  const borders: string[] = [];
  if (country.borders) {
    country.borders.forEach((border) => {
      const borderCountry = countryList.find((c) => c.cca3.toLowerCase() === border.toLowerCase());
      if (borderCountry) {
        borders.push(borderCountry.name.common);
      }
    });
  }

  const languages = country.languages ? Object.values(country.languages) : [];

  keywords.push(...languages);

  const demonyms: string[] = [];
  if (country.demonyms && country.demonyms.eng) {
    if (country.demonyms.eng.m !== country.demonyms.eng.f) {
      demonyms.push(country.demonyms.eng.m, country.demonyms.eng.f);
    } else {
      demonyms.push(country.demonyms.eng.m);
    }
  }

  keywords.push(...demonyms);

  return { phone, markdownCoat, keywords, borders, languages, demonyms };
};

export default useExtraFields;
