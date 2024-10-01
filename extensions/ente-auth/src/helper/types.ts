interface Secret {
  username: string;
  secret: string;
}

interface SecretData {
  [serviceName: string]: Secret[];
}

interface JsonFormat {
  service_name: string;
  current_totp: string;
  current_totp_time_remaining: number;
  next_totp: string;
  username?: string;
  icon?: string;
}

export type { Secret, SecretData as ServiceData, JsonFormat };
