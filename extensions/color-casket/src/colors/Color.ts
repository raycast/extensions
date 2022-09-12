import { Keyboard } from "@raycast/api";
import { HEX, HSL, KEYWORD, RGB } from "color-convert/conversions";
import { HEXColor, RGBColor, HSLColor, KeywordColor } from "./index";

export class InvalidColor extends Error {}

export type AvailableColorValue = HEX | RGB | HSL | KEYWORD;
export type AvailableColor = HEXColor | RGBColor | HSLColor | KeywordColor;
export enum ColorType {
  HEX = "HEX",
  RGB = "RGB",
  HSL = "HSL",
  KEYWORD = "KEYWORD",
}

export default abstract class Color<T> {
  public abstract type: string;

  public static validator: (value: string) => boolean;

  public static prepareValue: <T>(value: string) => T;

  public abstract readonly shortcut: Keyboard.Shortcut;

  protected value: T;

  public constructor(value: T) {
    this.value = value;
  }

  abstract get alternatives(): AvailableColor[];

  abstract stringValue(): string;

  public serialize() {
    return { value: this.stringValue() };
  }
}
