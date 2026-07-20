/**
 * Parameterized tests for all API endpoints.
 *
 * These tests verify that each endpoint:
 * - Calls the correct HTTP method
 * - Constructs the correct URL
 * - Applies signing when required
 * - Parses responses correctly
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { get, post, put, del, type RequestOptions } from "../client";

vi.mock("../client");
vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock options for testing - actual values don't matter since client is mocked
const mockOptions = {
  authToken: "test-token",
} as RequestOptions;

// Mock response helpers
const mockListResponse = (key: string, items: object[]) => ({
  Response: items.map((item) => ({ [key]: item })),
});

const mockSingleResponse = (key: string, item: object) => ({
  Response: [{ [key]: item }],
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============== GET List Endpoints ==============

interface GetListTestCase {
  name: string;
  fn: () => Promise<unknown[]>;
  expectedUrl: string;
  responseKey: string;
  mockItem: object;
}

const getListTestCases: GetListTestCase[] = [
  // requests.ts
  {
    name: "getRequestInquiries",
    fn: async () => {
      const { getRequestInquiries } = await import("./requests");
      return getRequestInquiries("user1", 123, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/request-inquiry",
    responseKey: "RequestInquiry",
    mockItem: { id: 1, status: "PENDING" },
  },
  {
    name: "getRequestInquiryBatches",
    fn: async () => {
      const { getRequestInquiryBatches } = await import("./requests");
      return getRequestInquiryBatches("user1", 123, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/request-inquiry-batch",
    responseKey: "RequestInquiryBatch",
    mockItem: { id: 1 },
  },
  {
    name: "getRequestResponses",
    fn: async () => {
      const { getRequestResponses } = await import("./requests");
      return getRequestResponses("user1", 123, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/request-response",
    responseKey: "RequestResponse",
    mockItem: { id: 1, status: "PENDING" },
  },
  {
    name: "getBunqMeTabs",
    fn: async () => {
      const { getBunqMeTabs } = await import("./requests");
      return getBunqMeTabs("user1", 123, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/bunqme-tab",
    responseKey: "BunqMeTab",
    mockItem: { id: 1, bunqme_tab_share_url: "https://bunq.me/test" },
  },
  // transfers.ts
  {
    name: "getTransferWiseCurrencies",
    fn: async () => {
      const { getTransferWiseCurrencies } = await import("./transfers");
      return getTransferWiseCurrencies("user1", mockOptions);
    },
    expectedUrl: "/user/user1/transferwise-currency",
    responseKey: "TransferwiseCurrency",
    mockItem: { currency: "USD", name: "US Dollar" },
  },
  {
    name: "getTransferWiseQuotes",
    fn: async () => {
      const { getTransferWiseQuotes } = await import("./transfers");
      return getTransferWiseQuotes("user1", mockOptions);
    },
    expectedUrl: "/user/user1/transferwise-quote",
    responseKey: "TransferwiseQuote",
    mockItem: { id: 1, rate: "1.2" },
  },
  {
    name: "getTransferWiseTransfers",
    fn: async () => {
      const { getTransferWiseTransfers } = await import("./transfers");
      return getTransferWiseTransfers("user1", mockOptions);
    },
    expectedUrl: "/user/user1/transferwise-transfer",
    responseKey: "TransferwiseTransfer",
    mockItem: { id: 1, status: "COMPLETED" },
  },
  // misc.ts
  {
    name: "getEvents",
    fn: async () => {
      const { getEvents } = await import("./misc");
      return getEvents("user1", mockOptions);
    },
    expectedUrl: "/user/user1/event",
    responseKey: "Event",
    mockItem: { id: 1, action: "PAYMENT_CREATED" },
  },
  {
    name: "getNotificationFiltersPush",
    fn: async () => {
      const { getNotificationFiltersPush } = await import("./misc");
      return getNotificationFiltersPush("user1", mockOptions);
    },
    expectedUrl: "/user/user1/notification-filter-push",
    responseKey: "NotificationFilterPush",
    mockItem: { id: 1, category: "PAYMENT" },
  },
  {
    name: "getNotificationFilters (URL)",
    fn: async () => {
      const { getNotificationFilters } = await import("./misc");
      return getNotificationFilters("user1", mockOptions);
    },
    expectedUrl: "/user/user1/notification-filter-url",
    responseKey: "NotificationFilterUrl",
    mockItem: { id: 1, category: "PAYMENT", notification_target: "https://example.com" },
  },
  {
    name: "getInvoices",
    fn: async () => {
      const { getInvoices } = await import("./misc");
      return getInvoices("user1", mockOptions);
    },
    expectedUrl: "/user/user1/invoice",
    responseKey: "Invoice",
    mockItem: { id: 1, invoice_number: "INV-001" },
  },
  {
    name: "getDevices",
    fn: async () => {
      const { getDevices } = await import("./misc");
      return getDevices("user1", mockOptions);
    },
    expectedUrl: "/device-server",
    responseKey: "DeviceServer",
    mockItem: { id: 1, description: "Test Device" },
  },
  {
    name: "getBillingContractSubscription",
    fn: async () => {
      const { getBillingContractSubscription } = await import("./misc");
      return getBillingContractSubscription("user1", mockOptions);
    },
    expectedUrl: "/user/user1/billing-contract-subscription",
    responseKey: "BillingContractSubscription",
    mockItem: { id: 1, subscription_type: "PREMIUM" },
  },
  // shares.ts
  {
    name: "getShareInvites",
    fn: async () => {
      const { getShareInvites } = await import("./shares");
      return getShareInvites("user1", 123, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/share-invite-monetary-account-inquiry",
    responseKey: "ShareInviteMonetaryAccountInquiry",
    mockItem: { id: 1, status: "PENDING" },
  },
  {
    name: "getShareInviteResponses",
    fn: async () => {
      const { getShareInviteResponses } = await import("./shares");
      return getShareInviteResponses("user1", mockOptions);
    },
    expectedUrl: "/user/user1/share-invite-monetary-account-response",
    responseKey: "ShareInviteMonetaryAccountResponse",
    mockItem: { id: 1, status: "ACCEPTED" },
  },
  // allocations.ts
  {
    name: "getAutoAllocations",
    fn: async () => {
      const { getAutoAllocations } = await import("./allocations");
      return getAutoAllocations("user1", 123, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/automatic-allocation",
    responseKey: "AutomaticAllocationRule",
    mockItem: { id: 1, type: "PERCENTAGE", percentage: 50 },
  },
  // users.ts
  {
    name: "getUsers",
    fn: async () => {
      const { getUsers } = await import("./users");
      return getUsers(mockOptions);
    },
    expectedUrl: "/user",
    responseKey: "UserPerson",
    mockItem: { id: 1, display_name: "Test User" },
  },
];

describe("GET list endpoints", () => {
  it.each(getListTestCases)(
    "$name calls correct URL and parses response",
    async ({ fn, expectedUrl, responseKey, mockItem }) => {
      vi.mocked(get).mockResolvedValue(mockListResponse(responseKey, [mockItem]));

      const result = await fn();

      expect(get).toHaveBeenCalledWith(expectedUrl, mockOptions);
      expect(Array.isArray(result)).toBe(true);
    },
  );
});

// ============== GET Single Endpoints ==============

interface GetSingleTestCase {
  name: string;
  fn: () => Promise<unknown>;
  expectedUrl: string;
  responseKey: string;
  mockItem: object;
}

const getSingleTestCases: GetSingleTestCase[] = [
  {
    name: "getEvent",
    fn: async () => {
      const { getEvent } = await import("./misc");
      return getEvent("user1", 456, mockOptions);
    },
    expectedUrl: "/user/user1/event/456",
    responseKey: "Event",
    mockItem: { id: 456, action: "PAYMENT_CREATED" },
  },
  {
    name: "getInvoice",
    fn: async () => {
      const { getInvoice } = await import("./misc");
      return getInvoice("user1", 789, mockOptions);
    },
    expectedUrl: "/user/user1/invoice/789",
    responseKey: "Invoice",
    mockItem: { id: 789, invoice_number: "INV-001" },
  },
  {
    name: "getTransferWiseTransfer",
    fn: async () => {
      const { getTransferWiseTransfer } = await import("./transfers");
      return getTransferWiseTransfer("user1", 100, mockOptions);
    },
    expectedUrl: "/user/user1/transferwise-transfer/100",
    responseKey: "TransferwiseTransfer",
    mockItem: { id: 100, status: "COMPLETED" },
  },
];

describe("GET single endpoints", () => {
  it.each(getSingleTestCases)("$name calls correct URL", async ({ fn, expectedUrl, responseKey, mockItem }) => {
    vi.mocked(get).mockResolvedValue(mockSingleResponse(responseKey, mockItem));

    await fn();

    expect(get).toHaveBeenCalledWith(expectedUrl, mockOptions);
  });
});

// ============== POST Create Endpoints (with signing) ==============

interface PostCreateTestCase {
  name: string;
  fn: () => Promise<unknown>;
  expectedUrl: string;
  expectedBody: object;
  expectSigning: boolean;
}

const postCreateTestCases: PostCreateTestCase[] = [
  {
    name: "createRequestInquiry",
    fn: async () => {
      const { createRequestInquiry } = await import("./requests");
      return createRequestInquiry(
        "user1",
        123,
        {
          amount_inquired: { value: "10.00", currency: "EUR" },
          counterparty_alias: { type: "EMAIL", value: "test@example.com" },
          description: "Test request",
          allow_bunqme: true,
        },
        mockOptions,
      );
    },
    expectedUrl: "/user/user1/monetary-account/123/request-inquiry",
    expectedBody: {
      amount_inquired: { value: "10.00", currency: "EUR" },
      counterparty_alias: { type: "EMAIL", value: "test@example.com" },
      description: "Test request",
      allow_bunqme: true,
    },
    expectSigning: true,
  },
  {
    name: "createRequestInquiryBatch",
    fn: async () => {
      const { createRequestInquiryBatch } = await import("./requests");
      return createRequestInquiryBatch(
        "user1",
        123,
        [
          {
            amount_inquired: { value: "10.00", currency: "EUR" },
            counterparty_alias: { type: "EMAIL", value: "test@example.com" },
            description: "Test",
            allow_bunqme: true,
          },
        ],
        mockOptions,
      );
    },
    expectedUrl: "/user/user1/monetary-account/123/request-inquiry-batch",
    expectedBody: {
      request_inquiries: [
        {
          amount_inquired: { value: "10.00", currency: "EUR" },
          counterparty_alias: { type: "EMAIL", value: "test@example.com" },
          description: "Test",
          allow_bunqme: true,
        },
      ],
    },
    expectSigning: true,
  },
  {
    name: "createBunqMeTab",
    fn: async () => {
      const { createBunqMeTab } = await import("./requests");
      return createBunqMeTab("user1", 123, { bunqme_tab_entry: { description: "Test tab" } }, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/bunqme-tab",
    expectedBody: { bunqme_tab_entry: { description: "Test tab" } },
    expectSigning: true,
  },
  {
    name: "createTransferWiseQuote",
    fn: async () => {
      const { createTransferWiseQuote } = await import("./transfers");
      return createTransferWiseQuote("user1", { currency_source: "EUR", currency_target: "USD" }, mockOptions);
    },
    expectedUrl: "/user/user1/transferwise-quote",
    expectedBody: { currency_source: "EUR", currency_target: "USD" },
    expectSigning: true,
  },
  {
    name: "setNotificationFiltersPush",
    fn: async () => {
      const { setNotificationFiltersPush } = await import("./misc");
      return setNotificationFiltersPush("user1", [{ category: "PAYMENT" }], mockOptions);
    },
    expectedUrl: "/user/user1/notification-filter-push",
    expectedBody: { notification_filters: [{ category: "PAYMENT" }] },
    expectSigning: true,
  },
  {
    name: "createNotificationFilter",
    fn: async () => {
      const { createNotificationFilter } = await import("./misc");
      return createNotificationFilter(
        "user1",
        { category: "PAYMENT", notification_target: "https://example.com" },
        mockOptions,
      );
    },
    expectedUrl: "/user/user1/notification-filter-url",
    expectedBody: { category: "PAYMENT", notification_target: "https://example.com" },
    expectSigning: true,
  },
  {
    name: "createShareInvite",
    fn: async () => {
      const { createShareInvite } = await import("./shares");
      return createShareInvite(
        "user1",
        123,
        {
          counter_user_alias: { type: "EMAIL", value: "friend@example.com" },
          share_detail: { payment: { make_payments: true, view_balance: true } },
          status: "PENDING",
        },
        mockOptions,
      );
    },
    expectedUrl: "/user/user1/monetary-account/123/share-invite-monetary-account-inquiry",
    expectedBody: {
      counter_user_alias: { type: "EMAIL", value: "friend@example.com" },
      share_detail: { payment: { make_payments: true, view_balance: true } },
      status: "PENDING",
    },
    expectSigning: true,
  },
  {
    name: "createAutoAllocation",
    fn: async () => {
      const { createAutoAllocation } = await import("./allocations");
      return createAutoAllocation(
        "user1",
        123,
        { type: "PERCENTAGE", percentage: 50, target_account_id: 456 },
        mockOptions,
      );
    },
    expectedUrl: "/user/user1/monetary-account/123/automatic-allocation",
    expectedBody: { type: "PERCENTAGE", percentage: 50, target_account_id: 456 },
    expectSigning: true,
  },
];

describe("POST create endpoints", () => {
  it.each(postCreateTestCases)(
    "$name calls correct URL with signing=$expectSigning",
    async ({ fn, expectedUrl, expectedBody, expectSigning }) => {
      // Mock for createBunqMeTab which expects both Id and BunqMeTab in response
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 1 } }, { BunqMeTab: { id: 1, bunqme_tab_share_url: "https://bunq.me/test" } }],
      });

      // Mock for createTransferWiseQuote which fetches the quote after creation
      vi.mocked(get).mockResolvedValue({
        Response: [{ TransferwiseQuote: { id: 1, rate: "1.2" } }],
      });

      await fn();

      expect(post).toHaveBeenCalledWith(expectedUrl, expectedBody, expect.objectContaining({ sign: expectSigning }));
    },
  );
});

// ============== PUT Update Endpoints ==============

interface PutUpdateTestCase {
  name: string;
  fn: () => Promise<void>;
  expectedUrl: string;
  expectedBody: object;
  expectSigning: boolean;
}

const putUpdateTestCases: PutUpdateTestCase[] = [
  {
    name: "revokeRequestInquiry",
    fn: async () => {
      const { revokeRequestInquiry } = await import("./requests");
      return revokeRequestInquiry("user1", 123, 456, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/request-inquiry/456",
    expectedBody: { status: "REVOKED" },
    expectSigning: true,
  },
  {
    name: "respondToRequest (accept)",
    fn: async () => {
      const { respondToRequest } = await import("./requests");
      return respondToRequest("user1", 123, 789, { status: "ACCEPTED" }, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/request-response/789",
    expectedBody: { status: "ACCEPTED" },
    expectSigning: true,
  },
  {
    name: "closeBunqMeTab",
    fn: async () => {
      const { closeBunqMeTab } = await import("./requests");
      return closeBunqMeTab("user1", 123, 999, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/bunqme-tab/999",
    expectedBody: { status: "CANCELLED" },
    expectSigning: true,
  },
  {
    name: "updateShareInvite",
    fn: async () => {
      const { updateShareInvite } = await import("./shares");
      return updateShareInvite("user1", 123, 456, { status: "CANCELLED" }, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/share-invite-monetary-account-inquiry/456",
    expectedBody: { status: "CANCELLED" },
    expectSigning: true,
  },
  {
    name: "respondToShareInvite",
    fn: async () => {
      const { respondToShareInvite } = await import("./shares");
      return respondToShareInvite("user1", 789, "ACCEPTED", mockOptions);
    },
    expectedUrl: "/user/user1/share-invite-monetary-account-response/789",
    expectedBody: { status: "ACCEPTED" },
    expectSigning: true,
  },
  {
    name: "revokeShareInvite",
    fn: async () => {
      const { revokeShareInvite } = await import("./shares");
      return revokeShareInvite("user1", 123, 456, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/share-invite-monetary-account-inquiry/456",
    expectedBody: { status: "REVOKED" },
    expectSigning: true,
  },
];

describe("PUT update endpoints", () => {
  it.each(putUpdateTestCases)(
    "$name calls correct URL with signing=$expectSigning",
    async ({ fn, expectedUrl, expectedBody, expectSigning }) => {
      vi.mocked(put).mockResolvedValue({ Response: [] });

      await fn();

      expect(put).toHaveBeenCalledWith(expectedUrl, expectedBody, expect.objectContaining({ sign: expectSigning }));
    },
  );
});

// ============== DELETE Endpoints ==============

interface DeleteTestCase {
  name: string;
  fn: () => Promise<void>;
  expectedUrl: string;
}

const deleteTestCases: DeleteTestCase[] = [
  {
    name: "deleteNotificationFilterPush",
    fn: async () => {
      const { deleteNotificationFilterPush } = await import("./misc");
      return deleteNotificationFilterPush("user1", 123, mockOptions);
    },
    expectedUrl: "/user/user1/notification-filter-push/123",
  },
  {
    name: "deleteNotificationFilter",
    fn: async () => {
      const { deleteNotificationFilter } = await import("./misc");
      return deleteNotificationFilter("user1", 456, mockOptions);
    },
    expectedUrl: "/user/user1/notification-filter-url/456",
  },
  {
    name: "deleteDevice",
    fn: async () => {
      const { deleteDevice } = await import("./misc");
      return deleteDevice(789, mockOptions);
    },
    expectedUrl: "/device-server/789",
  },
  {
    name: "deleteWhitelistSdd",
    fn: async () => {
      const { deleteWhitelistSdd } = await import("./misc");
      return deleteWhitelistSdd("user1", 123, 456, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/whitelist-sdd/456",
  },
  {
    name: "deleteAutoAllocation",
    fn: async () => {
      const { deleteAutoAllocation } = await import("./allocations");
      return deleteAutoAllocation("user1", 123, 456, mockOptions);
    },
    expectedUrl: "/user/user1/monetary-account/123/automatic-allocation/456",
  },
];

describe("DELETE endpoints", () => {
  it.each(deleteTestCases)("$name calls correct URL", async ({ fn, expectedUrl }) => {
    vi.mocked(del).mockResolvedValue({ Response: [] });

    await fn();

    expect(del).toHaveBeenCalledWith(expectedUrl, mockOptions);
  });
});

// ============== Special Cases ==============

describe("special endpoint behaviors", () => {
  it("getEvents builds query string with pagination params", async () => {
    vi.mocked(get).mockResolvedValue(mockListResponse("Event", []));

    const { getEvents } = await import("./misc");
    await getEvents("user1", mockOptions, { count: 25, older_id: 100 });

    expect(get).toHaveBeenCalledWith("/user/user1/event?count=25&older_id=100", mockOptions);
  });

  it("getTreeProgress aggregates multiple response types", async () => {
    vi.mocked(get).mockResolvedValue({
      Response: [
        { TreeProgressUser: { number_of_tree: 10, progress_tree_next: 0.5 } },
        { TreeProgressCard: { number_of_tree: 3 } },
        { TreeProgressReferral: { number_of_tree: 2 } },
        { TreeProgressReward: { number_of_tree: 5 } },
      ],
    });

    const { getTreeProgress } = await import("./misc");
    const result = await getTreeProgress("user1", mockOptions);

    expect(result).toEqual({
      total_trees: 10,
      card_trees: 3,
      referral_trees: 2,
      reward_trees: 5,
      progress_to_next: 0.5,
    });
  });

  it("getWhitelistSdd handles multiple whitelist types", async () => {
    vi.mocked(get).mockResolvedValue({
      Response: [
        { WhitelistSdd: { id: 1, type: "REGULAR" } },
        { WhitelistSddOneOff: { id: 2, type: "ONE_OFF" } },
        { WhitelistSddRecurring: { id: 3, type: "RECURRING" } },
      ],
    });

    const { getWhitelistSdd } = await import("./misc");
    const result = await getWhitelistSdd("user1", 123, mockOptions);

    expect(result).toHaveLength(3);
  });

  it("createTransferWiseTransfer extracts ID from response", async () => {
    vi.mocked(post).mockResolvedValue({
      Response: [{ TransferwiseTransfer: { id: 999, status: "CREATED" } }],
    });

    const { createTransferWiseTransfer } = await import("./transfers");
    const id = await createTransferWiseTransfer(
      "user1",
      {
        monetary_account_id: 123,
        recipient_id: "recipient-1",
        amount: { value: "100.00", currency: "USD" },
      },
      mockOptions,
    );

    expect(id).toBe(999);
  });

  it("getUsers handles multiple user types", async () => {
    vi.mocked(get).mockResolvedValue({
      Response: [
        { UserPerson: { id: 1, display_name: "Person" } },
        { UserCompany: { id: 2, display_name: "Company" } },
      ],
    });

    const { getUsers } = await import("./users");
    const result = await getUsers(mockOptions);

    expect(result).toHaveLength(2);
  });
});
