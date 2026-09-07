/**
 * Kloak Raycast Extension — IPC Client
 * Connects directly to the local Kloak Daemon via Unix domain socket or TCP port 53152.
 */

import * as net from 'node:net';
import * as path from 'node:path';
import * as os from 'node:os';

const SOCKET_PATH = path.join(os.homedir(), '.kloak', 'kloak.sock');
const TCP_PORT = 53152;
const TCP_HOST = '127.0.0.1';

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
  algorithm?: string;
  digits?: number;
  period?: number;
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
    const tryConnect = (useSocket: boolean) => {
      const client = useSocket
        ? net.createConnection(SOCKET_PATH)
        : net.createConnection(TCP_PORT, TCP_HOST);

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
        if (useSocket) {
          tryConnect(false);
        } else {
          reject(new Error(`Could not connect to Kloak Daemon. Please make sure Kloak is running. (${err.message})`));
        }
      });
    };

    tryConnect(true);
  });
}
