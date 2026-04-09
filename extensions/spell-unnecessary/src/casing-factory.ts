import _ from "lodash";
import { Casing } from "./casing.enum";

interface ICasing {
  toCase(value: string): string;
}

function toICasing(fn: ICasing["toCase"]): ICasing {
  return { toCase: fn };
}

const CASING_TO_ICASING_TABLE: Record<Casing, ICasing> = {
  [Casing.CamelCase]: toICasing(_.camelCase),
  [Casing.SnakeCase]: toICasing(_.snakeCase),
  [Casing.KebabCase]: toICasing(_.kebabCase),
};

export class CasingFactory {
  static getICasing(casingEnum: Casing): ICasing {
    return CASING_TO_ICASING_TABLE[casingEnum];
  }
}
