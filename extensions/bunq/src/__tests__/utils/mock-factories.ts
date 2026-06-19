/**
 * Mock data factories for testing.
 * Provides factory functions to create test data with sensible defaults.
 */

import type { MonetaryAccount, Payment, Card, RequestInquiry, BunqMeTab, Event } from "../../api/endpoints";

/**
 * Creates a mock monetary account with defaults.
 */
export function createMockAccount(overrides: Partial<MonetaryAccount> = {}): MonetaryAccount {
  return {
    accountType: "MonetaryAccountBank",
    id: 1,
    description: "Test Account",
    status: "ACTIVE",
    currency: "EUR",
    balance: {
      value: "1000.00",
      currency: "EUR",
    },
    public_uuid: "test-uuid-123",
    alias: [
      {
        type: "IBAN",
        value: "NL00BUNQ0000000001",
        name: "Test Account",
      },
    ],
    daily_limit: {
      value: "10000.00",
      currency: "EUR",
    },
    notification_filters: [],
    created: "2024-01-01T00:00:00.000Z",
    updated: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Creates a list of mock accounts.
 */
export function createMockAccounts(count: number = 3): MonetaryAccount[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAccount({
      id: i + 1,
      description: `Account ${i + 1}`,
      public_uuid: `uuid-${i + 1}`,
      alias: [
        {
          type: "IBAN",
          value: `NL00BUNQ000000000${i + 1}`,
          name: `Account ${i + 1}`,
        },
      ],
    }),
  );
}

/**
 * Creates a mock payment with defaults.
 */
export function createMockPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    created: "2024-01-01T12:00:00.000Z",
    updated: "2024-01-01T12:00:00.000Z",
    monetary_account_id: 1,
    amount: {
      value: "50.00",
      currency: "EUR",
    },
    description: "Test payment",
    type: "BUNQ",
    sub_type: "PAYMENT",
    alias: {
      type: "IBAN",
      value: "NL00BUNQ0000000001",
      name: "Sender Account",
    },
    counterparty_alias: {
      type: "IBAN",
      value: "NL00BUNQ0000000002",
      name: "Recipient",
    },
    ...overrides,
  };
}

/**
 * Creates a list of mock payments.
 */
export function createMockPayments(count: number = 5): Payment[] {
  return Array.from({ length: count }, (_, i) =>
    createMockPayment({
      id: i + 1,
      description: `Payment ${i + 1}`,
      amount: {
        value: `${(i + 1) * 25}.00`,
        currency: "EUR",
      },
      created: new Date(2024, 0, i + 1).toISOString(),
    }),
  );
}

/**
 * Creates a mock card with defaults.
 */
export function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    cardCategory: "CardDebit",
    id: 1,
    created: "2024-01-01T00:00:00.000Z",
    updated: "2024-01-01T00:00:00.000Z",
    public_uuid: "card-uuid-123",
    type: "MASTERCARD",
    sub_type: "VIRTUAL",
    second_line: "JOHN DOE",
    name_on_card: "JOHN DOE",
    status: "ACTIVE",
    order_status: "ACCEPTED_FOR_PRODUCTION",
    expiry_date: "2027-01-31",
    limit: [
      {
        daily_limit: "1000.00",
        currency: "EUR",
        type: "CARD_LIMIT_ATM",
      },
    ],
    country_permission: [{ country: "NL", id: 1 }],
    monetary_account_id_fallback: 1,
    label_monetary_account_ordered: {
      iban: "NL00BUNQ0000000001",
      display_name: "Main Account",
      avatar: null,
      label_user: { public_nick_name: "John", display_name: "John Doe" },
      country: "NL",
    },
    label_monetary_account_current: {
      iban: "NL00BUNQ0000000001",
      display_name: "Main Account",
      avatar: null,
      label_user: { public_nick_name: "John", display_name: "John Doe" },
      country: "NL",
    },
    pin_code_assignment: [],
    primary_account_numbers: [],
    ...overrides,
  };
}

/**
 * Creates a mock request inquiry with defaults.
 */
export function createMockRequestInquiry(overrides: Partial<RequestInquiry> = {}): RequestInquiry {
  return {
    id: 1,
    created: "2024-01-01T12:00:00.000Z",
    updated: "2024-01-01T12:00:00.000Z",
    time_responded: null,
    time_expiry: "2024-02-01T12:00:00.000Z",
    monetary_account_id: 1,
    amount_inquired: {
      value: "100.00",
      currency: "EUR",
    },
    amount_responded: null,
    status: "PENDING",
    description: "Test request",
    user_alias_created: {
      type: "IBAN",
      value: "NL00BUNQ0000000001",
      name: "Requester",
    },
    counterparty_alias: {
      type: "EMAIL",
      value: "test@example.com",
      name: "Recipient",
    },
    ...overrides,
  };
}

/**
 * Creates a mock bunq.me tab with defaults.
 */
export function createMockBunqMeTab(overrides: Partial<BunqMeTab> = {}): BunqMeTab {
  return {
    id: 1,
    created: "2024-01-01T12:00:00.000Z",
    updated: "2024-01-01T12:00:00.000Z",
    monetary_account_id: 1,
    status: "WAITING_FOR_PAYMENT",
    bunqme_tab_share_url: "https://bunq.me/test-link",
    bunqme_tab_entry: {
      uuid: "entry-uuid-123",
      amount_inquired: {
        value: "50.00",
        currency: "EUR",
      },
      alias: {
        type: "IBAN",
        value: "NL00BUNQ0000000001",
        name: "Test Account",
        display_name: "Test Account",
        country: "NL",
        label_user: { public_nick_name: "Test", display_name: "Test User" },
        iban: "NL00BUNQ0000000001",
      },
      description: "Test bunq.me request",
      redirect_url: null,
    },
    result_inquiries: [],
    ...overrides,
  };
}

/**
 * Creates a mock event with defaults.
 */
export function createMockEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    created: "2024-01-01T12:00:00.000Z",
    updated: "2024-01-01T12:00:00.000Z",
    action: "CREATE",
    user_id: 123,
    monetary_account_id: 1,
    object: {
      Payment: createMockPayment(),
    },
    status: "FINALIZED",
    ...overrides,
  };
}

/**
 * Creates a mock API response wrapper.
 */
export function createMockApiResponse<T>(data: T[], key: string): { Response: Record<string, T>[] } {
  return {
    Response: data.map((item) => ({ [key]: item })),
  };
}

/**
 * Creates a mock ID response.
 */
export function createMockIdResponse(id: number): { Response: { Id: { id: number } }[] } {
  return {
    Response: [{ Id: { id } }],
  };
}

/**
 * Creates mock request options for API calls.
 */
export function createMockRequestOptions() {
  return {
    baseUrl: "https://api.sandbox.bunq.com/v1",
    headers: {
      "X-Bunq-Client-Authentication": "test-session-token",
    },
  };
}
