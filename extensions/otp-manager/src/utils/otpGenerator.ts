import * as crypto from "crypto";
import { OTPConfig } from "../types";

/**
 * Genera un código OTP basado en una configuración
 */
export function generateOTP(config: OTPConfig): string {
  const { secret, algorithm, digits, period } = config;

  // Decodificar el secreto en base32
  const secretBuffer = base32ToBuffer(secret);

  // Calcular el contador basado en el tiempo actual
  const counter = Math.floor(Date.now() / 1000 / period);

  // Crear un buffer de 8 bytes para el contador
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  // Calcular el HMAC
  const hmac = crypto.createHmac(algorithm, secretBuffer);
  hmac.update(counterBuffer);
  const hmacResult = hmac.digest();

  // Calcular el código OTP
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binary =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);

  // Formatear el OTP con ceros a la izquierda si es necesario
  return otp.toString().padStart(digits, "0");
}

/**
 * Convierte un string base32 a un Buffer
 */
function base32ToBuffer(base32: string): Buffer {
  // Implementación de la decodificación base32
  // Nota: Para una implementación real, considera usar una biblioteca como 'thirty-two'
  base32 = base32.toUpperCase().replace(/=+$/, "");

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = base32
    .split("")
    .map((char) => alphabet.indexOf(char))
    .map((index) => index.toString(2).padStart(5, "0"))
    .join("");

  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    if (i + 8 <= bits.length) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
  }

  return Buffer.from(bytes);
}

/**
 * Calcula el tiempo restante en segundos para el cambio del código OTP
 */
export function getRemainingSeconds(period: number): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}
