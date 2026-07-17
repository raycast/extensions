import https from 'node:https';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { environment } from '@raycast/api';
import { createLog } from '../lib/debug';
import { cache } from '../lib/cache';
const log = createLog('mtlsAgent');

const clientCertPath = path.join(environment.assetsPath, 'link_play_cert.pem');
const clientKeyPath = path.join(environment.assetsPath, 'link_play_key.pem');
const deviceCertPath = path.join(environment.assetsPath, 'linkplay.pem');

let clientCert: Buffer | undefined;
let clientKey: Buffer | undefined;
let deviceCert: Buffer | undefined;

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

  if (fs.existsSync(deviceCertPath)) {
    deviceCert = fs.readFileSync(deviceCertPath);
    log.log(`Device certificate loaded (${deviceCert.length} bytes)`);
  } else {
    log.log(`Device certificate not found at: ${deviceCertPath}`);
  }
} catch (error) {
  log.error(`Failed to load certificates: ${(error as Error).message}`);
}

function extractServername(cert: Buffer): string | undefined {
  const x509 = new crypto.X509Certificate(cert);
  const san = x509.subjectAltName;

  if (san) {
    const dns = san.split(', ').find((entry) => entry.startsWith('DNS:'));

    if (dns) {
      return dns.slice(4);
    }
  }

  const cn = x509.subject.split('\n').find((c) => c.startsWith('CN='));

  if (cn) {
    return cn.slice(3);
  }

  return undefined;
}

export const mtlsAgent = (() => {
  let servername = cache.deviceServername;

  if (cache.deviceCert) {
    deviceCert = Buffer.from(cache.deviceCert);
    log.log(`Device certificate loaded from cache (${deviceCert.length} bytes)`);

    if (!servername) {
      try {
        servername = extractServername(deviceCert);
      } catch (error) {
        log.error(`Failed to parse cached certificate: ${(error as Error).message}`);
      }
    }
  } else if (deviceCert) {
    try {
      servername = extractServername(deviceCert);
      log.log(`Device certificate servername: ${servername || 'not found'}`);
    } catch (error) {
      log.error(`Failed to parse device certificate: ${(error as Error).message}`);
    }
  }

  return new https.Agent({
    ca: deviceCert ? [deviceCert] : undefined,
    cert: clientCert,
    key: clientKey,
    servername,
    maxCachedSessions: 0
  });
})();
