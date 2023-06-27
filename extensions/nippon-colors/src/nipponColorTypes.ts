import { NipponColorAgent } from "./nipponColorAgent";

export type ioResponseJson = {
  index: string;
  cmyk: string;
  rgb: string;
};

export type onLoadingColors = (name: string, colorCode: string) => void;
