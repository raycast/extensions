import { connectDevice, listMdnsServices, pairDevice, type MdnsService } from "./adb";
import type { PairingCredentials } from "./qr";

const PAIRING_SERVICE = "_adb-tls-pairing._tcp";
const CONNECT_SERVICE = "_adb-tls-connect._tcp";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
      } else {
        resolve();
      }
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function findPairingService(services: MdnsService[], serviceName: string): MdnsService | undefined {
  return services.find(
    (service) => service.serviceType === PAIRING_SERVICE && service.instanceName.includes(serviceName),
  );
}

function findConnectService(services: MdnsService[], host: string): MdnsService | undefined {
  return services.find((service) => service.serviceType === CONNECT_SERVICE && service.host === host);
}

export async function waitForPairingService(
  adbPath: string,
  serviceName: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<MdnsService> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const services = await listMdnsServices(adbPath);
    const match = findPairingService(services, serviceName);
    if (match) {
      return match;
    }
    await sleep(500, signal);
  }

  throw new Error("Timed out waiting for the device to scan the QR code.");
}

export async function waitForConnectService(
  adbPath: string,
  host: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<MdnsService> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const services = await listMdnsServices(adbPath);
    const match = findConnectService(services, host);
    if (match) {
      return match;
    }
    await sleep(500, signal);
  }

  throw new Error(
    `Paired with ${host} but could not discover the connect service. Use the IP and port shown under Wireless debugging on your phone, then run: adb connect ${host}:<port>`,
  );
}

export type PairingFlowCallbacks = {
  onPhase: (phase: PairingPhase) => void;
};

export type PairingPhase = "waiting_scan" | "pairing" | "connecting" | "connected";

export async function runPairingFlow(
  adbPath: string,
  credentials: PairingCredentials,
  pairingTimeoutMs: number,
  signal: AbortSignal,
  callbacks: PairingFlowCallbacks,
): Promise<{ host: string; connectPort: number; pairMessage: string; connectMessage: string }> {
  callbacks.onPhase("waiting_scan");

  const pairingService = await waitForPairingService(adbPath, credentials.serviceName, pairingTimeoutMs, signal);

  callbacks.onPhase("pairing");
  const pairMessage = await pairDevice(adbPath, pairingService.host, pairingService.port, credentials.password);

  callbacks.onPhase("connecting");
  const connectService = await waitForConnectService(adbPath, pairingService.host, 15_000, signal);
  const connectMessage = await connectDevice(adbPath, connectService.host, connectService.port);

  callbacks.onPhase("connected");
  return {
    host: connectService.host,
    connectPort: connectService.port,
    pairMessage,
    connectMessage,
  };
}
