import { showToast, Toast } from "@raycast/api";

export interface WLEDDevice {
  name: string;
  ip: string;
}

export interface WLEDSegment {
  id: number;
  start: number;
  stop: number;
  len: number;
  grp: number;
  spc: number;
  of: number;
  on: boolean;
  frz: boolean;
  bri: number;
  cct: number;
  col: number[][];
  fx: number; // effect ID
  sx: number; // speed
  ix: number; // intensity
  pal: number; // palette
  sel: boolean;
  rev: boolean;
  mi: boolean;
}

export interface WLEDState {
  on: boolean;
  bri: number; // brightness 0-255
  transition: number;
  ps: number; // preset
  pl: number; // playlist
  nl: {
    on: boolean;
    dur: number;
    mode: number;
    tbri: number;
  };
  udpn: {
    send: boolean;
    recv: boolean;
  };
  lor: number;
  mainseg: number;
  seg: WLEDSegment[];
}

export interface WLEDInfo {
  ver: string;
  vid: number;
  leds: {
    count: number;
    rgbw: boolean;
    wv: boolean;
    pin: number[];
    pwr: number;
    maxpwr: number;
    maxseg: number;
  };
  name: string;
  udpport: number;
  live: boolean;
  fxcount: number;
  palcount: number;
  wifi: {
    bssid: string;
    rssi: number;
    signal: number;
    channel: number;
  };
  fs: {
    u: number;
    t: number;
    pmt: number;
  };
  ndc: number;
  arch: string;
  core: string;
  freeheap: number;
  uptime: number;
  opt: number;
  brand: string;
  product: string;
  mac: string;
  ip: string;
}

export interface WLEDEffect {
  id: number;
  name: string;
}

export interface WLEDPalette {
  id: number;
  name: string;
}

export interface WLEDJson {
  state: WLEDState;
  info: WLEDInfo;
  effects: string[];
  palettes: string[];
}

/**
 * WLED API Client
 */
export class WLEDClient {
  private baseUrl: string;

  constructor(private device: WLEDDevice) {
    this.baseUrl = `http://${device.ip}`;
  }

  /**
   * Get full WLED state and info
   */
  async getState(): Promise<WLEDJson> {
    try {
      const response = await fetch(`${this.baseUrl}/json`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as WLEDJson;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get WLED state",
        message: `Device: ${this.device.name} - ${error}`,
      });
      throw error;
    }
  }

  /**
   * Set WLED state
   */
  async setState(state: Partial<Omit<WLEDState, "seg">> & { seg?: Array<Partial<WLEDSegment>> }): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/json/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "WLED Updated",
        message: `${this.device.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update WLED",
        message: `Device: ${this.device.name} - ${error}`,
      });
      throw error;
    }
  }

  /**
   * Turn on/off
   */
  async setPower(on: boolean): Promise<void> {
    await this.setState({ on });
  }

  /**
   * Set brightness (0-255)
   */
  async setBrightness(brightness: number): Promise<void> {
    await this.setState({ bri: Math.max(0, Math.min(255, brightness)) });
  }

  /**
   * Set color (RGB)
   */
  async setColor(r: number, g: number, b: number, segment = 0): Promise<void> {
    await this.setState({
      seg: [
        {
          id: segment,
          col: [[r, g, b]],
        } as Partial<WLEDSegment>,
      ],
    });
  }

  /**
   * Set color from hex string
   */
  async setColorHex(hex: string, segment = 0): Promise<void> {
    const rgb = this.hexToRgb(hex);
    if (rgb) {
      await this.setColor(rgb.r, rgb.g, rgb.b, segment);
    }
  }

  /**
   * Set effect
   */
  async setEffect(effectId: number, segment = 0): Promise<void> {
    await this.setState({
      seg: [
        {
          id: segment,
          fx: effectId,
        } as Partial<WLEDSegment>,
      ],
    });
  }

  /**
   * Set effect speed (0-255)
   */
  async setEffectSpeed(speed: number, segment = 0): Promise<void> {
    await this.setState({
      seg: [
        {
          id: segment,
          sx: Math.max(0, Math.min(255, speed)),
        } as Partial<WLEDSegment>,
      ],
    });
  }

  /**
   * Set effect intensity (0-255)
   */
  async setEffectIntensity(intensity: number, segment = 0): Promise<void> {
    await this.setState({
      seg: [
        {
          id: segment,
          ix: Math.max(0, Math.min(255, intensity)),
        } as Partial<WLEDSegment>,
      ],
    });
  }

  /**
   * Set palette
   */
  async setPalette(paletteId: number, segment = 0): Promise<void> {
    await this.setState({
      seg: [
        {
          id: segment,
          pal: paletteId,
        } as Partial<WLEDSegment>,
      ],
    });
  }

  /**
   * Set preset
   */
  async setPreset(presetId: number): Promise<void> {
    await this.setState({ ps: presetId });
  }

  /**
   * Helper: Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Helper: Convert RGB to hex
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
}

/**
 * Parse devices from preferences
 */
export function parseDevices(devicesJson: string | undefined): WLEDDevice[] {
  if (!devicesJson || devicesJson.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(devicesJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((d) => d.name && d.ip);
    }
    return [];
  } catch (error) {
    console.error("Failed to parse devices:", error);
    return [];
  }
}
