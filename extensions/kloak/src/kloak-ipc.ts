/**
 * Kloak Raycast Extension — IPC Client
 * Connects directly to the local Kloak Daemon via secure Unix domain socket (~/.kloak/kloak.sock).
 */

import * as net from 'node:net';
import * as path from 'node:path';
import * as os from 'node:os';

const SOCKET_PATH = path.join(os.homedir(), '.kloak', 'kloak.sock');

export interface CardDetails {
  cardholderName?: string;
  number?: string;
  brand?: string;
  expMonth?: string;
  expYear?: string;
  cvv?: string;
  billingAddress?: string;
}

export interface IdentityDetails {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  ssn?: string;
}

export interface AliasDetails {
  aliasEmail?: string;
  forwardTo?: string;
  provider?: string;
}

export interface AuthenticatorDetails {
  issuer?: string;
  type?: 'totp' | 'hotp';
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512' | string;
  digits?: number;
  period?: number;
  counter?: number;
}

export interface CustomField {
  id: string;
  name: string;
  value: string;
  type?: string;
}

export interface KloakItem {
  id: string;
  type: 'login' | 'secure_note' | 'card' | 'identity' | 'email_alias' | 'authenticator';
  title: string;
  username?: string;
  password?: string;
  urls: string[];
  notes?: string;
  totpSecret?: string;
  card?: CardDetails;
  identity?: IdentityDetails;
  alias?: AliasDetails;
  authenticatorDetails?: AuthenticatorDetails;
  customFields?: CustomField[];
  favorite?: boolean;
  trashed?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export async function requestDaemon(method: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(SOCKET_PATH);
    let buffer = '';

    client.on('connect', () => {
      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      });
      client.write(payload + '\n');
    });

    client.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
      if (buffer.includes('\n')) {
        try {
          const res = JSON.parse(buffer.trim());
          client.end();
          if (res.error) reject(new Error(res.error.message));
          else resolve(res.result);
        } catch (e) {
          client.end();
          reject(e);
        }
      }
    });

    client.on('error', (err) => {
      reject(new Error(`Could not connect to Kloak Daemon. Please make sure the Kloak app is running and unlocked. (${err.message})`));
    });
  });
}
