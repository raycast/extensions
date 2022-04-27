import { HEXColor, RGBColor, HSLColor, KeywordColor } from "./index";

export type Variants = {
  hex: HEXColor;
  rgb: RGBColor;
  hsl: HSLColor;
  keyword: KeywordColor;
};

export class InvalidColor extends Error {}

export type AvailableColor = HSLColor | RGBColor | HEXColor | KeywordColor;

export default abstract class Color<T> {
  public static validator: (value: string) => boolean;

  public static prepareValue: <T>(value: string) => T;

  protected value: T;

  public constructor(value: T) {
    this.value = value;
  }

  abstract get alternatives(): AvailableColor[];

  abstract stringValue(): string;

  public get type() {
    return this.constructor.name.replace("Color", "");
  }

  public serialize() {
    return { value: this.stringValue() };
  }
}
