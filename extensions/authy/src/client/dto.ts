export interface ApiError {
  message: string,
  success: boolean,
  errors: {
    message: string
  },
  error_code: string
}

export interface Registration {
  message: string,
  request_id: string,
  approval_pin: number,
  provider: string,
  success: boolean
}

export interface RegistrationStatus {
  message: {
    request_status: string
  },
  status: string,
  pin: string,
  success: boolean
}

export interface Device {
  device: {
    id: number,
    secret_seed: string,
    api_key: string,
    reinstall: boolean
  },
  authy_id: number
}

export interface AuthyApp {
  message: string,
  apps: [
    {
      _id: string,
      name: string,
      serial_id: number,
      version: number,
      assets_group: string,
      background_color: string,
      circle_background: string,
      circle_color: string,
      custom_assets: boolean,
      generating_assets: boolean,
      labels_color: string,
      labels_shadow_color: string,
      timer_color: string,
      token_color: string,
      authy_id: number,
      secret_seed: string,
      digits: number,
      member_since: number,
      transactional_otp: boolean
    }
  ],
  deleted: string[],
  success: boolean
}

export interface Services {
  message: string,
  authenticator_tokens: [
    {
      account_type: string,
      digits: number,
      encrypted_seed: string,
      issuer: string,
      logo: string,
      name: string,
      original_name: string,
      password_timestamp: number,
      salt: string,
      unique_id: string
    }
  ],
  deleted: string[],
  success: boolean
}
