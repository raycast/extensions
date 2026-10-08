import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";
import { createLog } from "../lib/debug";
import { cache } from "../lib/cache";

const log = createLog("mtlsAgent");

const clientCertPath = path.join(environment.assetsPath, "link_play_cert.pem");
const clientKeyPath = path.join(environment.assetsPath, "link_play_key.pem");

let clientCert: Buffer | undefined;
let clientKey: Buffer | undefined;

try {
  if (fs.existsSync(clientCertPath)) {
    clientCert = fs.readFileSync(clientCertPath);
    log.log(`Client certificate loaded (${clientCert.length} bytes)`);
  } else {
    log.log(`Client certificate not found at: ${clientCertPath}`);
  }

  if (fs.existsSync(clientKeyPath)) {
    clientKey = fs.readFileSync(clientKeyPath);
    log.log(`Client private key loaded (${clientKey.length} bytes)`);
  } else {
    log.log(`Client private key not found at: ${clientKeyPath}`);
  }
} catch (error) {
  log.error(`Failed to load certificates: ${(error as Error).message}`);
}

let _agent: https.Agent | null = null;
let _lastCert: string | undefined;

export function getAgent(): https.Agent {
  const certPem = cache.deviceCert;
  const servername = cache.deviceServername;

  if (certPem !== _lastCert || !_agent) {
    const ca = certPem ? Buffer.from(certPem) : undefined;

    _agent = new https.Agent({
      ca: ca ? [ca] : undefined,
      cert: clientCert,
      key: clientKey,
      servername,
      rejectUnauthorized: !!ca,
      maxCachedSessions: 0,
    });
    _lastCert = certPem;
  }

  return _agent;
}
