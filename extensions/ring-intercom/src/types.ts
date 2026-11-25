export interface TokenResponse {
  access_token?: string;
  // Seconds until access_token expires
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
  tsv_state?: string;
  phone?: string;
  status?: number;
  message?: string;
  tsv_required?: boolean;
}

export interface LocationsResponse {
  status?: number;
  error?: string;
}

export interface AuthState {
  email: string;
  password: string;
  twoFactorCode: string;
  isLoading: boolean;
  twoFactorType: string | null;
  twoFactorPrompt: string;
  phone?: string;
  emailError: boolean;
  emailFormatError: string | undefined;
  passwordError: boolean;
  twoFactorError: boolean;
  twoFactorNumericError: string | undefined;
  twoFactorWarning?: string;
  tsv_state?: string;
}

// Base device interface - defines common properties
export interface BaseRingDevice {
  // A number in Ring's responses
  id: number | string;
  kind: string;
  description: string;
  [key: string]: unknown;
}

// API response containing devices
export interface RingDevicesResponse {
  other?: BaseRingDevice[];
}

// Ring Intercom and Ring Intercom Video. Ring sends more fields than these.
export interface RingIntercomDevice extends BaseRingDevice {
  kind: "intercom_handset_audio" | "intercom_handset_video";
  // "online" or "offline"
  alerts?: { connection?: string };
  // Battery percentage, as a number or a string
  battery_life?: number | string | null;
  battery_life_2?: number | string | null;
  health?: { battery_percentage?: number };
}
