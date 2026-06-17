/**
 * Tests for account-helpers utilities.
 */

import { describe, it, expect } from "vitest";
import { getAccountTypeLabel, groupAccountsByType, getPaymentCounterparty } from "./account-helpers";
import type { MonetaryAccount, MonetaryAccountType, Payment } from "../../api/endpoints";

// Helper to create a mock account
function createMockAccount(overrides: Partial<MonetaryAccount> = {}): MonetaryAccount {
  return {
    id: 1,
    description: "Test Account",
    status: "ACTIVE",
    balance: { value: "1000.00", currency: "EUR" },
    currency: "EUR",
    alias: [],
    created: "2024-01-01",
    updated: "2024-01-01",
    accountType: "MonetaryAccountBank",
    ...overrides,
  };
}

// Helper to create a mock payment - uses Record type to allow undefined overrides for testing
function createMockPayment(overrides: Record<string, unknown> = {}): Payment {
  return {
    id: 1,
    created: "2024-01-01T12:00:00.000Z",
    updated: "2024-01-01T12:00:00.000Z",
    amount: { value: "-50.00", currency: "EUR" },
    description: "Test payment",
    monetary_account_id: 1,
    type: "PAYMENT",
    sub_type: "REGULAR",
    alias: { type: "IBAN", value: "NL00BUNQ0000000001", name: "Sender" },
    counterparty_alias: { type: "IBAN", value: "NL00BUNQ0000000002", name: "Recipient" },
    ...overrides,
  } as Payment;
}

describe("account-helpers", () => {
  describe("getAccountTypeLabel", () => {
    it("returns correct label for MonetaryAccountJoint", () => {
      expect(getAccountTypeLabel("MonetaryAccountJoint")).toBe("Joint Accounts");
    });

    it("returns correct label for MonetaryAccountBank", () => {
      expect(getAccountTypeLabel("MonetaryAccountBank")).toBe("Bank Accounts");
    });

    it("returns correct label for MonetaryAccountSavings", () => {
      expect(getAccountTypeLabel("MonetaryAccountSavings")).toBe("Savings Accounts");
    });

    it("returns Other Accounts for unknown type", () => {
      expect(getAccountTypeLabel("UnknownType" as MonetaryAccountType)).toBe("Other Accounts");
    });
  });

  describe("groupAccountsByType", () => {
    it("groups accounts by type", () => {
      const accounts = [
        createMockAccount({ id: 1, accountType: "MonetaryAccountBank" }),
        createMockAccount({ id: 2, accountType: "MonetaryAccountSavings" }),
        createMockAccount({ id: 3, accountType: "MonetaryAccountBank" }),
      ];

      const groups = groupAccountsByType(accounts);

      expect(groups.get("MonetaryAccountBank")).toHaveLength(2);
      expect(groups.get("MonetaryAccountSavings")).toHaveLength(1);
    });

    it("removes empty groups", () => {
      const accounts = [createMockAccount({ id: 1, accountType: "MonetaryAccountBank" })];

      const groups = groupAccountsByType(accounts);

      expect(groups.has("MonetaryAccountBank")).toBe(true);
      expect(groups.has("MonetaryAccountSavings")).toBe(false);
      expect(groups.has("MonetaryAccountJoint")).toBe(false);
    });

    it("handles unknown account types", () => {
      const accounts = [createMockAccount({ id: 1, accountType: "MonetaryAccountExternal" as MonetaryAccountType })];

      const groups = groupAccountsByType(accounts);

      expect(groups.get("MonetaryAccountExternal" as MonetaryAccountType)).toHaveLength(1);
    });

    it("returns empty map for empty input", () => {
      const groups = groupAccountsByType([]);
      expect(groups.size).toBe(0);
    });

    it("maintains type order", () => {
      const accounts = [
        createMockAccount({ id: 1, accountType: "MonetaryAccountSavings" }),
        createMockAccount({ id: 2, accountType: "MonetaryAccountJoint" }),
        createMockAccount({ id: 3, accountType: "MonetaryAccountBank" }),
      ];

      const groups = groupAccountsByType(accounts);
      const keys = Array.from(groups.keys());

      // Joint should come before Bank, Bank before Savings
      expect(keys.indexOf("MonetaryAccountJoint")).toBeLessThan(keys.indexOf("MonetaryAccountBank"));
      expect(keys.indexOf("MonetaryAccountBank")).toBeLessThan(keys.indexOf("MonetaryAccountSavings"));
    });
  });

  describe("getPaymentCounterparty", () => {
    it("returns counterparty display_name when available", () => {
      const payment = createMockPayment({
        counterparty_alias: {
          display_name: "John Doe",
          type: "EMAIL",
          value: "john@example.com",
        },
      });

      expect(getPaymentCounterparty(payment)).toBe("John Doe");
    });

    it("returns counterparty name when display_name is not available", () => {
      const payment = createMockPayment({
        counterparty_alias: {
          name: "Jane Smith",
          type: "EMAIL",
          value: "jane@example.com",
        },
      });

      expect(getPaymentCounterparty(payment)).toBe("Jane Smith");
    });

    it("returns label_monetary_account display_name as fallback", () => {
      const payment = createMockPayment({
        counterparty_alias: undefined,
        label_monetary_account: {
          display_name: "Account Label",
        },
      });

      expect(getPaymentCounterparty(payment)).toBe("Account Label");
    });

    it("returns counterparty IBAN as fallback", () => {
      const payment = createMockPayment({
        counterparty_alias: {
          type: "IBAN",
          value: "NL91ABNA0417164300",
          iban: "NL91ABNA0417164300",
        },
      });

      expect(getPaymentCounterparty(payment)).toBe("NL91ABNA0417164300");
    });

    it("returns counterparty value as fallback", () => {
      const payment = createMockPayment({
        counterparty_alias: {
          type: "EMAIL",
          value: "test@example.com",
        },
      });

      expect(getPaymentCounterparty(payment)).toBe("test@example.com");
    });

    it("returns description as fallback", () => {
      const payment = createMockPayment({
        counterparty_alias: undefined,
        description: "Coffee purchase",
      });

      expect(getPaymentCounterparty(payment)).toBe("Coffee purchase");
    });

    it("returns Deposit for incoming payments without counterparty", () => {
      const payment = createMockPayment({
        counterparty_alias: undefined,
        description: undefined,
        amount: { value: "100.00", currency: "EUR" },
        type: "PAYMENT",
      });

      expect(getPaymentCounterparty(payment)).toBe("Deposit");
    });

    it("returns Withdrawal for outgoing payments without counterparty", () => {
      const payment = createMockPayment({
        counterparty_alias: undefined,
        description: undefined,
        amount: { value: "-50.00", currency: "EUR" },
        type: "PAYMENT",
      });

      expect(getPaymentCounterparty(payment)).toBe("Withdrawal");
    });

    it("returns Deposit for BUNQ type incoming payments", () => {
      const payment = createMockPayment({
        counterparty_alias: undefined,
        description: undefined,
        amount: { value: "25.00", currency: "EUR" },
        type: "BUNQ",
      });

      expect(getPaymentCounterparty(payment)).toBe("Deposit");
    });

    it("returns sub_type for other payment types without counterparty", () => {
      const payment = createMockPayment({
        counterparty_alias: undefined,
        description: undefined,
        type: "OTHER",
        sub_type: "CARD_PAYMENT",
      });

      expect(getPaymentCounterparty(payment)).toBe("CARD_PAYMENT");
    });

    it("returns type for payments without sub_type", () => {
      const payment = createMockPayment({
        counterparty_alias: undefined,
        description: undefined,
        type: "IDEAL",
        sub_type: undefined,
      });

      expect(getPaymentCounterparty(payment)).toBe("IDEAL");
    });

    it("returns Transfer for payments without any info", () => {
      const payment = createMockPayment({
        counterparty_alias: undefined,
        description: undefined,
        type: undefined,
        sub_type: undefined,
      });

      expect(getPaymentCounterparty(payment)).toBe("Transfer");
    });
  });
});
