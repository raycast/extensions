import { OTPConfig } from "../types";
import crypto from "crypto";
// Añadimos estas importaciones para Node.js
import { URL, URLSearchParams } from "url";

/**
 * Parsea un URL de OTP Auth en un objeto de configuración
 */
export function parseOTPAuthURL(url: string): OTPConfig | null {
  try {
    const otpUrl = new URL(url);

    if (otpUrl.protocol !== "otpauth:" || otpUrl.host !== "totp") {
      throw new Error("Invalid URL: must start with 'otpauth://totp/'");
    }

    // Extraer el nombre del servicio de la ruta
    const name = decodeURIComponent(otpUrl.pathname.substring(1));

    // Extraer los parámetros
    const params = new URLSearchParams(otpUrl.search);
    const secret = params.get("secret");

    if (!secret) {
      throw new Error("Invalid URL: missing 'secret' parameter");
    }

    // Extraer los demás parámetros con valores por defecto si no existen
    const algorithm = (params.get("algorithm") || "SHA1") as "SHA1" | "SHA256" | "SHA512";
    const digits = parseInt(params.get("digits") || "6", 10);
    const period = parseInt(params.get("period") || "10", 10);
    const issuer = params.get("issuer") || undefined;

    return {
      id: crypto.randomUUID(),
      name,
      issuer,
      secret,
      algorithm,
      digits,
      period,
    };
  } catch (error) {
    console.error("Error parsing OTP URL:", error);
    return null;
  }
}

/**
 * Parsea un array de URLs OTP Auth desde un JSON
 */
export function parseOTPFromJSON(jsonContent: string): OTPConfig[] {
  try {
    const urls = JSON.parse(jsonContent) as string[];

    if (!Array.isArray(urls)) {
      throw new Error("JSON content must be an array of strings");
    }

    return urls.map(parseOTPAuthURL).filter((config): config is OTPConfig => config !== null);
  } catch (error) {
    console.error("Error parsing OTP JSON:", error);
    return [];
  }
}
