export type DictionaryItem = {
  tag: string;
  name: string;
  vr: string;
  vm: string;
};

export type ValueRepresentation =
  | "AE"
  | "AS"
  | "AT"
  | "CS"
  | "DA"
  | "DS"
  | "DT"
  | "FL"
  | "FD"
  | "IS"
  | "LO"
  | "LT"
  | "OB"
  | "OD"
  | "OF"
  | "OL"
  | "OV"
  | "OW"
  | "PN"
  | "SH"
  | "SL"
  | "SQ"
  | "SS"
  | "ST"
  | "SV"
  | "TM"
  | "UC"
  | "UI"
  | "UL"
  | "UN"
  | "UR"
  | "US"
  | "UT"
  | "UV";
