import QRCode from "qrcode";
import { randomAlphanumeric } from "./random";

export type PairingCredentials = {
  serviceName: string;
  password: string;
  payload: string;
};

export function buildPairingPayload(serviceName: string, password: string): string {
  return `WIFI:T:ADB;S:${serviceName};P:${password};;`;
}

export function createPairingCredentials(): PairingCredentials {
  const serviceName = `raycast-${randomAlphanumeric(8)}`;
  const password = randomAlphanumeric(8);
  const payload = buildPairingPayload(serviceName, password);
  return { serviceName, password, payload };
}

export async function payloadToDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 220,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
