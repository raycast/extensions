/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
export default class CityType {
  static parse(str, env) {
    let country = env.country;
    let matches;
    let abbreviation = str;
    if ((matches = str.match(/^(\w\w+)(\.)(.+)$/))) {
      [, country, , abbreviation] = matches;
    }
    const cities = env.data.types.city[country] || [];
    if (abbreviation in cities) {
      const city = cities[abbreviation];
      return city;
    }
    return false;
  }
}
