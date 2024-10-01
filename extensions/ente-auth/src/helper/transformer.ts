import { JsonFormat, Secret } from "./types";

export const dataTransformer = (
  serviceName: string,
  username: string,
  currentTotp: string,
  currentTotpTimeRemaining: number,
  nextTotp: string,
): JsonFormat => {
  return {
    service_name: serviceName.replace(/\+/g, " "),
    username,
    current_totp: currentTotp,
    current_totp_time_remaining: currentTotpTimeRemaining,
    next_totp: nextTotp,
  };
};

export const getAllSecretNames = (data: Secret[]): string[] => Object.keys(data);
