import { LocalStorage } from "@raycast/api";
import { OTPConfig } from "../types";

const STORAGE_KEY = "otp-configs";

/**
 * Guarda las configuraciones OTP en el almacenamiento local
 */
export async function saveOTPConfigs(configs: OTPConfig[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

/**
 * Carga las configuraciones OTP desde el almacenamiento local
 */
export async function loadOTPConfigs(): Promise<OTPConfig[]> {
  const data = await LocalStorage.getItem(STORAGE_KEY);

  if (!data) {
    return [];
  }

  try {
    return JSON.parse(data as string) as OTPConfig[];
  } catch (error) {
    console.error("Error al cargar configuraciones OTP:", error);
    return [];
  }
}

/**
 * Agrega una configuración OTP al almacenamiento local
 */
export async function addOTPConfig(config: OTPConfig): Promise<void> {
  const configs = await loadOTPConfigs();
  configs.push(config);
  await saveOTPConfigs(configs);
}

/**
 * Elimina una configuración OTP del almacenamiento local
 */
export async function removeOTPConfig(id: string): Promise<void> {
  const configs = await loadOTPConfigs();
  const updatedConfigs = configs.filter((config) => config.id !== id);
  await saveOTPConfigs(updatedConfigs);
}
