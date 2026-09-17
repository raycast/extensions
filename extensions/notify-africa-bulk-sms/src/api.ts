import { API_BASE_URL, type SmsMessage } from './lib.js';

export type SingleSendResponse = {
  messageId?: string;
  status?: string;
};

export type BulkSendResponse = {
  acceptedCount: number;
  rejectedCount: number;
  creditsDeducted: number;
  remainingBalance: number;
  results: Array<{ messageId?: string }>;
};

export class NotifyApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'NotifyApiError';
  }
}

export function sendSingle(
  apiKey: string,
  senderId: string,
  message: SmsMessage,
): Promise<SingleSendResponse> {
  return request('/api/messages/send', apiKey, {
    senderId,
    recipient: message.recipient,
    content: message.content,
  });
}

export function sendBulk(
  apiKey: string,
  senderId: string,
  messages: SmsMessage[],
): Promise<BulkSendResponse> {
  return request('/api/messages/send-bulk', apiKey, { senderId, messages });
}

async function request<T>(
  path: string,
  apiKey: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new NotifyApiError(
      errorMessage(payload, response.status),
      response.status,
    );
  }

  return unwrap<T>(payload);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function unwrap<T>(payload: unknown): T {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

function errorMessage(payload: unknown, status: number): string {
  if (status === 401) {
    return 'Your API key is invalid, expired, or lacks Bulk SMS access.';
  }
  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }
  return status >= 500
    ? 'Notify Africa is temporarily unavailable. Try again later.'
    : 'Notify Africa rejected this request. Check the form values and try again.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
