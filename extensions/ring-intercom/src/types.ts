export interface TokenResponse {
  access_token?: string;
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
  twoFactorType: "totp" | "sms" | null;
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
  id: string;
  kind: string;
  description: string;
  [key: string]: unknown;
}

// API response containing devices
export interface RingDevicesResponse {
  other: BaseRingDevice[];
}

// Specific intercom interface
export interface RingIntercomDevice extends BaseRingDevice {
  kind: "intercom_handset_audio";
}
