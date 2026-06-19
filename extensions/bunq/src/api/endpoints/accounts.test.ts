/**
 * Tests for accounts API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMonetaryAccounts,
  getMonetaryAccount,
  getInsights,
  createCustomerStatement,
  getCustomerStatements,
} from "./accounts";
import { get, post, type RequestOptions } from "../client";

vi.mock("../client");
vi.mock("../../lib/logger");

// Mock options for testing - actual values don't matter since client is mocked
const mockRequestOptions = {
  authToken: "test-session-token",
} as RequestOptions;

// Helper to create complete mock account data
const createMockAccountData = (id: number, description: string, overrides = {}) => ({
  id,
  description,
  status: "ACTIVE",
  balance: { value: "1000.00", currency: "EUR" },
  currency: "EUR",
  alias: [{ type: "IBAN", value: `NL00BUNQ000000000${id}`, name: description }],
  created: "2024-01-01T00:00:00.000Z",
  updated: "2024-01-01T00:00:00.000Z",
  public_uuid: `uuid-${id}`,
  ...overrides,
});

describe("accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMonetaryAccounts", () => {
    it("fetches and parses multiple account types", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          { MonetaryAccountBank: createMockAccountData(1, "Main Account") },
          {
            MonetaryAccountSavings: createMockAccountData(2, "Savings", {
              balance: { value: "5000.00", currency: "EUR" },
            }),
          },
        ],
      });

      const accounts = await getMonetaryAccounts("user123", mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account", mockRequestOptions);
      expect(accounts).toHaveLength(2);
      expect(accounts[0]!.accountType).toBe("MonetaryAccountBank");
      expect(accounts[0]!.description).toBe("Main Account");
      expect(accounts[1]!.accountType).toBe("MonetaryAccountSavings");
      expect(accounts[1]!.description).toBe("Savings");
    });

    it("handles empty response", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const accounts = await getMonetaryAccounts("user123", mockRequestOptions);

      expect(accounts).toHaveLength(0);
    });

    it("handles joint accounts", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            MonetaryAccountJoint: createMockAccountData(3, "Joint Account", {
              balance: { value: "2500.00", currency: "EUR" },
            }),
          },
        ],
      });

      const accounts = await getMonetaryAccounts("user123", mockRequestOptions);

      expect(accounts).toHaveLength(1);
      expect(accounts[0]!.accountType).toBe("MonetaryAccountJoint");
    });

    it("handles external accounts", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            MonetaryAccountExternal: createMockAccountData(4, "External Account", {
              balance: { value: "0.00", currency: "EUR" },
            }),
          },
        ],
      });

      const accounts = await getMonetaryAccounts("user123", mockRequestOptions);

      expect(accounts).toHaveLength(1);
      expect(accounts[0]!.accountType).toBe("MonetaryAccountExternal");
    });

    it("handles card accounts", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            MonetaryAccountCard: createMockAccountData(5, "Card Account", {
              balance: { value: "100.00", currency: "EUR" },
            }),
          },
        ],
      });

      const accounts = await getMonetaryAccounts("user123", mockRequestOptions);

      expect(accounts).toHaveLength(1);
      expect(accounts[0]!.accountType).toBe("MonetaryAccountCard");
    });

    it("skips unrecognized account types", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          { MonetaryAccountBank: createMockAccountData(1, "Main Account") },
          { UnknownAccountType: { id: 999, description: "Unknown" } },
        ],
      });

      const accounts = await getMonetaryAccounts("user123", mockRequestOptions);

      expect(accounts).toHaveLength(1);
      expect(accounts[0]!.id).toBe(1);
    });
  });

  describe("getMonetaryAccount", () => {
    it("fetches a single account by ID", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ MonetaryAccountBank: createMockAccountData(1, "Main Account") }],
      });

      const account = await getMonetaryAccount("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1", mockRequestOptions);
      expect(account).not.toBeNull();
      expect(account?.id).toBe(1);
      expect(account?.description).toBe("Main Account");
      expect(account?.accountType).toBe("MonetaryAccountBank");
    });

    it("returns null when account not found", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const account = await getMonetaryAccount("user123", 999, mockRequestOptions);

      expect(account).toBeNull();
    });

    it("handles different account types", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            MonetaryAccountSavings: createMockAccountData(2, "Savings", {
              balance: { value: "5000.00", currency: "EUR" },
            }),
          },
        ],
      });

      const account = await getMonetaryAccount("user123", 2, mockRequestOptions);

      expect(account?.accountType).toBe("MonetaryAccountSavings");
    });
  });

  describe("getInsights", () => {
    it("fetches spending insights", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            InsightCategory: {
              category: "GROCERIES",
              category_translated: "Groceries",
              total_amount: { value: "-150.00", currency: "EUR" },
              number_of_transactions: 15,
            },
          },
          {
            InsightCategory: {
              category: "TRANSPORT",
              category_translated: "Transport",
              total_amount: { value: "-75.00", currency: "EUR" },
              number_of_transactions: 8,
            },
          },
        ],
      });

      const insights = await getInsights("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/insight-preference-date", mockRequestOptions);
      expect(insights).toHaveLength(2);
    });

    it("handles empty insights", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const insights = await getInsights("user123", 1, mockRequestOptions);

      expect(insights).toHaveLength(0);
    });
  });

  describe("createCustomerStatement", () => {
    it("creates a customer statement and returns ID", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 123 } }],
      });

      const statementParams = {
        statement_format: "PDF" as const,
        date_start: "2024-01-01",
        date_end: "2024-01-31",
        regional_format: "EUROPEAN" as const,
      };

      const id = await createCustomerStatement("user123", 1, statementParams, mockRequestOptions);

      expect(post).toHaveBeenCalledWith("/user/user123/monetary-account/1/customer-statement", statementParams, {
        ...mockRequestOptions,
        sign: true,
      });
      expect(id).toBe(123);
    });

    it("handles CSV format", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 456 } }],
      });

      const statementParams = {
        statement_format: "CSV" as const,
        date_start: "2024-01-01",
        date_end: "2024-01-31",
        regional_format: "UK_US" as const,
      };

      const id = await createCustomerStatement("user123", 1, statementParams, mockRequestOptions);

      expect(id).toBe(456);
    });

    it("handles MT940 format", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 789 } }],
      });

      const statementParams = {
        statement_format: "MT940" as const,
        date_start: "2024-01-01",
        date_end: "2024-01-31",
        regional_format: "EUROPEAN" as const,
      };

      const id = await createCustomerStatement("user123", 1, statementParams, mockRequestOptions);

      expect(id).toBe(789);
    });

    it("throws when no ID returned", async () => {
      vi.mocked(post).mockResolvedValue({ Response: [] });

      const statementParams = {
        statement_format: "PDF" as const,
        date_start: "2024-01-01",
        date_end: "2024-01-31",
        regional_format: "EUROPEAN" as const,
      };

      await expect(createCustomerStatement("user123", 1, statementParams, mockRequestOptions)).rejects.toThrow(
        "No customer statement ID received",
      );
    });
  });

  describe("getCustomerStatements", () => {
    it("fetches customer statements", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            CustomerStatement: {
              id: 1,
              created: "2024-01-15T12:00:00.000Z",
              updated: "2024-01-15T12:00:00.000Z",
              status: "AVAILABLE",
              statement_format: "PDF",
              date_start: "2024-01-01",
              date_end: "2024-01-31",
            },
          },
          {
            CustomerStatement: {
              id: 2,
              created: "2024-02-15T12:00:00.000Z",
              updated: "2024-02-15T12:00:00.000Z",
              status: "PENDING",
              statement_format: "CSV",
              date_start: "2024-02-01",
              date_end: "2024-02-29",
            },
          },
        ],
      });

      const statements = await getCustomerStatements("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/customer-statement", mockRequestOptions);
      expect(statements).toHaveLength(2);
    });

    it("handles empty statements", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const statements = await getCustomerStatements("user123", 1, mockRequestOptions);

      expect(statements).toHaveLength(0);
    });
  });
});
