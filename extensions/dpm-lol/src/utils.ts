import { Color } from "@raycast/api";

export const PLATFORM_MAP: Record<string, { value: string; color: Color }> = {
  EUW1: { value: "EUW", color: Color.Blue },
  EUN1: { value: "EUNE", color: Color.Green },
  KR: { value: "KR", color: Color.Orange },
  NA1: { value: "NA", color: Color.Purple },
  TW2: { value: "TW", color: Color.Red },
  JP1: { value: "JP", color: Color.Magenta },
  BR1: { value: "BR", color: Color.Green },
  VN2: { value: "VN", color: Color.Green },
  SG2: { value: "SG", color: Color.Red },
  TR1: { value: "TR", color: Color.Red },
  LA2: { value: "LAS", color: Color.Yellow },
  LA1: { value: "LAN", color: Color.Yellow },
  OC1: { value: "OCE", color: Color.Green },
};
