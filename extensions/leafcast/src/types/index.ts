export interface HsvWithName {
  hsv: tinycolor.ColorFormats.HSV;
  name: string;
}

export interface NumberWithMinMax {
  value: number;
  max: number;
  min: number;
}

export interface DeviceInfo {
  name: string;
  serialNo: string;
  manufacturer: string;
  firmwareVersion: string;
  model: string;
  state: {
    on: { value: boolean };
    brightness: NumberWithMinMax;
    hue: NumberWithMinMax;
    sat: NumberWithMinMax;
    ct: NumberWithMinMax;
    colorMode: string;
  };
  effects: {
    select: string;
    effectsList: string[];
  };
}
