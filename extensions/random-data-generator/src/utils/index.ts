import _ from "lodash";

import type { Item } from "@/components/FakerListItem";
import type { Faker } from "@/faker";

const blacklistPaths = [
  "locales",
  "locale",
  "_locale",
  "localeFallback",
  "_localeFallback",
  "definitions",
  "fake",
  "faker",
  "unique",
  "helpers",
  "mersenne",
  "random",
  "science",
];

export const buildItems = (path: string, faker: Faker) => {
  return _.reduce(
    path ? _.get(faker, path) : faker,
    (acc: Item[], func, key) => {
      if (blacklistPaths.includes(key)) {
        return acc;
      }

      if (_.isFunction(func)) {
        const getValue = (): string => {
          const value = func();
          if (_.isBoolean(value)) return value.toString();
          if (!value) return "";
          return value.toString();
        };
        acc.push({ section: path, id: key, value: getValue(), getValue });
      } else if (_.isObject(func)) {
        acc.push(...buildItems(path ? `${path}.${key}` : key, faker));
      }

      return acc;
    },
    [],
  );
};
