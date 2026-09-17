export const API_BASE_URL = 'https://api.notify.africa/api/v1';
const MAX_SMS_LENGTH = 918;

export type SmsMessage = {
  recipient: string;
  content: string;
};

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}

export function requireSenderId(value: string): string {
  const senderId = value.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      senderId,
    )
  ) {
    throw new InputError('Sender ID must be a UUID.');
  }
  return senderId;
}

export function normalizeTanzanianPhone(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, '');
  const nationalNumber = compact.startsWith('0') ? compact.slice(1) : compact;
  const phone = nationalNumber.startsWith('+')
    ? nationalNumber
    : nationalNumber.startsWith('255')
      ? `+${nationalNumber}`
      : `+255${nationalNumber}`;

  if (!/^\+255\d{9}$/.test(phone)) {
    throw new InputError(
      'Use a Tanzanian number such as 0712345678, 255712345678, or +255712345678.',
    );
  }

  return phone;
}

export function validateContent(value: string): string {
  const content = value.trim();
  if (!content) {
    throw new InputError('Message text is required.');
  }
  if (content.length > MAX_SMS_LENGTH) {
    throw new InputError(
      `Message text must be ${MAX_SMS_LENGTH} characters or fewer.`,
    );
  }
  return content;
}

export function parseBulkRecipients(value: string): string[] {
  return parseRecipientValues(value.split(/[\n,]/));
}

export function parseRecipientValues(values: string[]): string[] {
  const recipients = values
    .map((recipient) => recipient.trim())
    .filter(Boolean)
    .map(normalizeTanzanianPhone);

  if (!recipients.length) {
    throw new InputError('Add at least one recipient.');
  }

  assertNoDuplicates(recipients);
  return recipients;
}

export function parsePersonalizedMessages(value: string): SmsMessage[] {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new InputError('Add at least one phone number and message.');
  }

  const messages = lines.map((line, index) => {
    const separator = line.indexOf('|');
    if (separator < 1) {
      throw new InputError(
        `Line ${index + 1} must use phone number | message.`,
      );
    }

    return {
      recipient: normalizeTanzanianPhone(line.slice(0, separator)),
      content: validateContent(line.slice(separator + 1)),
    };
  });

  assertNoDuplicates(messages.map((message) => message.recipient));
  return messages;
}

function assertNoDuplicates(recipients: string[]): void {
  if (new Set(recipients).size !== recipients.length) {
    throw new InputError('Each recipient can appear only once per send.');
  }
}
