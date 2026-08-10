import { LocaleDefinition, allFakers, allLocales, faker as fakerInstance } from "@faker-js/faker";

class FakerClient {
  private _faker = fakerInstance;
  private _currentLocale = "en";

  constructor() {
    // Initialize with English locale
    this.setLocale("en");
  }

  get faker() {
    return this._faker;
  }

  get locale() {
    return this._currentLocale;
  }

  get locales() {
    // In v10, we get available locales from allLocales
    return allLocales;
  }

  setLocale(locale: string) {
    this._currentLocale = locale;
    // In v10, we need to switch to the appropriate faker instance
    if (allFakers[locale as keyof typeof allFakers]) {
      this._faker = allFakers[locale as keyof typeof allFakers];
    } else {
      // Fallback to default faker if locale not found
      this._faker = fakerInstance;
    }
  }

  // Reinitialize faker with a new locale
  reinitialize(locale: string) {
    this.setLocale(locale);
  }

  // Get the display name for a locale
  getLocaleDisplayName(localeCode: string): string {
    const locale = allLocales[localeCode as keyof typeof allLocales];
    return (locale as LocaleDefinition)?.metadata?.title || localeCode;
  }

  // Get a function from faker by path (e.g., "person.firstName")
  getFunction(path: string) {
    // In v10, we can use lodash get to access nested properties
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const _ = require("lodash");
    return _.get(this._faker, path);
  }
}

// Export a singleton instance
const fakerClient = new FakerClient();

export default fakerClient;
