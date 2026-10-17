export default class CityType {
  static parse(str: string, env: AnyObject) {
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
