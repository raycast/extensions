import { describe, it, expect } from "vitest";
import {
  getRequestStatusAppearance,
  getRequestResponseStatusAppearance,
  getScheduledPaymentStatusAppearance,
  getBunqMeStatusAppearance,
  getCardStatusAppearance,
  getDraftPaymentStatusAppearance,
  getPaymentBatchStatusAppearance,
  getInvoiceStatusAppearance,
  getStatementStatusAppearance,
  getTransferWiseStatusAppearance,
  getShareInviteStatusAppearance,
  getBalanceColor,
  getCategoryIcon,
  getPaymentDirectionIcon,
  getPaymentDirectionColor,
  getAccountTypeIcon,
  getCardTypeIcon,
  getWhitelistSddStatusAppearance,
  getMastercardActionStatusAppearance,
  getBillingContractStatusAppearance,
  getDeviceStatusAppearance,
} from "./status-helpers";
import { Color, Icon } from "@raycast/api";
import type { RequestStatus } from "./constants";

describe("status-helpers", () => {
  describe("getRequestStatusAppearance", () => {
    it("returns orange for PENDING", () => {
      const result = getRequestStatusAppearance("PENDING");
      expect(result.color).toBe(Color.Orange);
      expect(result.label).toBe("Pending");
    });

    it("returns green for ACCEPTED", () => {
      const result = getRequestStatusAppearance("ACCEPTED");
      expect(result.color).toBe(Color.Green);
      expect(result.label).toBe("Accepted");
    });

    it("returns red for REJECTED", () => {
      const result = getRequestStatusAppearance("REJECTED");
      expect(result.color).toBe(Color.Red);
      expect(result.label).toBe("Rejected");
    });

    it("returns red for REVOKED", () => {
      const result = getRequestStatusAppearance("REVOKED");
      expect(result.color).toBe(Color.Red);
    });

    it("returns red for EXPIRED", () => {
      const result = getRequestStatusAppearance("EXPIRED");
      expect(result.color).toBe(Color.Red);
    });

    it("returns default for unknown status", () => {
      const result = getRequestStatusAppearance("UNKNOWN" as RequestStatus);
      expect(result.color).toBe(Color.SecondaryText);
      expect(result.label).toBe("UNKNOWN");
    });
  });

  describe("getRequestResponseStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getRequestResponseStatusAppearance("PENDING").color).toBe(Color.Orange);
      expect(getRequestResponseStatusAppearance("ACCEPTED").color).toBe(Color.Green);
      expect(getRequestResponseStatusAppearance("REJECTED").color).toBe(Color.Red);
    });
  });

  describe("getScheduledPaymentStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getScheduledPaymentStatusAppearance("ACTIVE").color).toBe(Color.Green);
      expect(getScheduledPaymentStatusAppearance("FINISHED").color).toBe(Color.SecondaryText);
      expect(getScheduledPaymentStatusAppearance("CANCELLED").color).toBe(Color.Red);
    });
  });

  describe("getBunqMeStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getBunqMeStatusAppearance("WAITING_FOR_PAYMENT").color).toBe(Color.Orange);
      expect(getBunqMeStatusAppearance("PAID").color).toBe(Color.Green);
      expect(getBunqMeStatusAppearance("CANCELLED").color).toBe(Color.Red);
      expect(getBunqMeStatusAppearance("EXPIRED").color).toBe(Color.Red);
    });
  });

  describe("getCardStatusAppearance", () => {
    it("returns green for ACTIVE", () => {
      expect(getCardStatusAppearance("ACTIVE").color).toBe(Color.Green);
      expect(getCardStatusAppearance("active").color).toBe(Color.Green);
    });

    it("returns green for NONE (treat as active)", () => {
      expect(getCardStatusAppearance("NONE").color).toBe(Color.Green);
    });

    it("returns orange for DEACTIVATED", () => {
      expect(getCardStatusAppearance("DEACTIVATED").color).toBe(Color.Orange);
      expect(getCardStatusAppearance("DEACTIVATED").label).toBe("Frozen");
    });

    it("returns orange for BLOCKED", () => {
      expect(getCardStatusAppearance("BLOCKED").color).toBe(Color.Orange);
    });

    it("returns red for LOST", () => {
      expect(getCardStatusAppearance("LOST").color).toBe(Color.Red);
    });

    it("returns red for STOLEN", () => {
      expect(getCardStatusAppearance("STOLEN").color).toBe(Color.Red);
    });

    it("returns red for CANCELLED", () => {
      expect(getCardStatusAppearance("CANCELLED").color).toBe(Color.Red);
    });
  });

  describe("getDraftPaymentStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getDraftPaymentStatusAppearance("PENDING").color).toBe(Color.Orange);
      expect(getDraftPaymentStatusAppearance("ACCEPTED").color).toBe(Color.Green);
      expect(getDraftPaymentStatusAppearance("REJECTED").color).toBe(Color.Red);
      expect(getDraftPaymentStatusAppearance("CANCELLED").color).toBe(Color.Red);
    });
  });

  describe("getPaymentBatchStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getPaymentBatchStatusAppearance("ACTIVE").color).toBe(Color.Blue);
      expect(getPaymentBatchStatusAppearance("PROCESSING").color).toBe(Color.Orange);
      expect(getPaymentBatchStatusAppearance("COMPLETED").color).toBe(Color.Green);
      expect(getPaymentBatchStatusAppearance("FAILED").color).toBe(Color.Red);
    });
  });

  describe("getInvoiceStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getInvoiceStatusAppearance("OPEN").color).toBe(Color.Orange);
      expect(getInvoiceStatusAppearance("PAID").color).toBe(Color.Green);
      expect(getInvoiceStatusAppearance("OVERDUE").color).toBe(Color.Red);
      expect(getInvoiceStatusAppearance("VOIDED").color).toBe(Color.SecondaryText);
    });
  });

  describe("getStatementStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getStatementStatusAppearance("PENDING").color).toBe(Color.Orange);
      expect(getStatementStatusAppearance("DONE").color).toBe(Color.Green);
      expect(getStatementStatusAppearance("FAILED").color).toBe(Color.Red);
    });
  });

  describe("getTransferWiseStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getTransferWiseStatusAppearance("PENDING").color).toBe(Color.Orange);
      expect(getTransferWiseStatusAppearance("PROCESSING").color).toBe(Color.Blue);
      expect(getTransferWiseStatusAppearance("COMPLETED").color).toBe(Color.Green);
      expect(getTransferWiseStatusAppearance("CANCELLED").color).toBe(Color.Red);
      expect(getTransferWiseStatusAppearance("FUNDS_REFUNDED").color).toBe(Color.Orange);
    });
  });

  describe("getShareInviteStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getShareInviteStatusAppearance("PENDING").color).toBe(Color.Orange);
      expect(getShareInviteStatusAppearance("ACCEPTED").color).toBe(Color.Green);
      expect(getShareInviteStatusAppearance("REJECTED").color).toBe(Color.Red);
      expect(getShareInviteStatusAppearance("CANCELLED").color).toBe(Color.Red);
      expect(getShareInviteStatusAppearance("REVOKED").color).toBe(Color.Red);
    });
  });

  describe("getBalanceColor", () => {
    it("returns green for positive amounts", () => {
      expect(getBalanceColor("100.00")).toBe(Color.Green);
      expect(getBalanceColor(100)).toBe(Color.Green);
    });

    it("returns green for zero", () => {
      expect(getBalanceColor("0.00")).toBe(Color.Green);
      expect(getBalanceColor(0)).toBe(Color.Green);
    });

    it("returns red for negative amounts", () => {
      expect(getBalanceColor("-50.00")).toBe(Color.Red);
      expect(getBalanceColor(-50)).toBe(Color.Red);
    });
  });

  describe("getCategoryIcon", () => {
    it("returns Leaf for food categories", () => {
      expect(getCategoryIcon("food")).toBe(Icon.Leaf);
      expect(getCategoryIcon("Restaurant")).toBe(Icon.Leaf);
      expect(getCategoryIcon("groceries")).toBe(Icon.Leaf);
    });

    it("returns Car for transport categories", () => {
      expect(getCategoryIcon("transport")).toBe(Icon.Car);
      expect(getCategoryIcon("Travel")).toBe(Icon.Car);
    });

    it("returns Cart for shopping categories", () => {
      expect(getCategoryIcon("shopping")).toBe(Icon.Cart);
      expect(getCategoryIcon("retail")).toBe(Icon.Cart);
    });

    it("returns Star for entertainment categories", () => {
      expect(getCategoryIcon("entertainment")).toBe(Icon.Star);
      expect(getCategoryIcon("leisure")).toBe(Icon.Star);
    });

    it("returns Heart for health categories", () => {
      expect(getCategoryIcon("health")).toBe(Icon.Heart);
      expect(getCategoryIcon("medical")).toBe(Icon.Heart);
    });

    it("returns House for housing categories", () => {
      expect(getCategoryIcon("housing")).toBe(Icon.House);
      expect(getCategoryIcon("rent")).toBe(Icon.House);
    });

    it("returns LightBulb for utility categories", () => {
      expect(getCategoryIcon("utility")).toBe(Icon.LightBulb);
      expect(getCategoryIcon("bills")).toBe(Icon.LightBulb);
    });

    it("returns Tag for unknown categories", () => {
      expect(getCategoryIcon("other")).toBe(Icon.Tag);
      expect(getCategoryIcon("unknown")).toBe(Icon.Tag);
    });
  });

  describe("getPaymentDirectionIcon", () => {
    it("returns ArrowDown for incoming", () => {
      expect(getPaymentDirectionIcon(true)).toBe(Icon.ArrowDown);
    });

    it("returns ArrowUp for outgoing", () => {
      expect(getPaymentDirectionIcon(false)).toBe(Icon.ArrowUp);
    });
  });

  describe("getPaymentDirectionColor", () => {
    it("returns Green for incoming", () => {
      expect(getPaymentDirectionColor(true)).toBe(Color.Green);
    });

    it("returns Red for outgoing", () => {
      expect(getPaymentDirectionColor(false)).toBe(Color.Red);
    });
  });

  describe("getAccountTypeIcon", () => {
    it("returns Coins for savings", () => {
      expect(getAccountTypeIcon("savings")).toBe(Icon.Coins);
    });

    it("returns TwoPeople for joint", () => {
      expect(getAccountTypeIcon("joint")).toBe(Icon.TwoPeople);
    });

    it("returns Globe for external", () => {
      expect(getAccountTypeIcon("external")).toBe(Icon.Globe);
    });

    it("returns BankNote for default", () => {
      expect(getAccountTypeIcon("checking")).toBe(Icon.BankNote);
    });
  });

  describe("getCardTypeIcon", () => {
    it("returns Desktop for virtual", () => {
      expect(getCardTypeIcon("virtual")).toBe(Icon.Desktop);
    });

    it("returns Airplane for travel", () => {
      expect(getCardTypeIcon("travel")).toBe(Icon.Airplane);
    });

    it("returns CreditCard for debit", () => {
      expect(getCardTypeIcon("debit")).toBe(Icon.CreditCard);
    });

    it("returns CreditCard for default", () => {
      expect(getCardTypeIcon("unknown")).toBe(Icon.CreditCard);
    });
  });

  describe("getWhitelistSddStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getWhitelistSddStatusAppearance("ACTIVE").color).toBe(Color.Green);
      expect(getWhitelistSddStatusAppearance("PENDING").color).toBe(Color.Orange);
      expect(getWhitelistSddStatusAppearance("CANCELLED").color).toBe(Color.Red);
      expect(getWhitelistSddStatusAppearance("REJECTED").color).toBe(Color.Red);
    });

    it("handles lowercase", () => {
      expect(getWhitelistSddStatusAppearance("active").color).toBe(Color.Green);
    });
  });

  describe("getMastercardActionStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getMastercardActionStatusAppearance("APPROVED").color).toBe(Color.Green);
      expect(getMastercardActionStatusAppearance("DECLINED").color).toBe(Color.Red);
      expect(getMastercardActionStatusAppearance("PENDING").color).toBe(Color.Orange);
      expect(getMastercardActionStatusAppearance("REVERSED").color).toBe(Color.Blue);
    });
  });

  describe("getBillingContractStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getBillingContractStatusAppearance("ACTIVE").color).toBe(Color.Green);
      expect(getBillingContractStatusAppearance("PENDING").color).toBe(Color.Orange);
      expect(getBillingContractStatusAppearance("CANCELLED").color).toBe(Color.Red);
      expect(getBillingContractStatusAppearance("EXPIRED").color).toBe(Color.Red);
    });
  });

  describe("getDeviceStatusAppearance", () => {
    it("returns correct appearance for known statuses", () => {
      expect(getDeviceStatusAppearance("ACTIVE").color).toBe(Color.Green);
      expect(getDeviceStatusAppearance("BLOCKED").color).toBe(Color.Red);
    });

    it("returns default for unknown", () => {
      expect(getDeviceStatusAppearance("UNKNOWN").color).toBe(Color.SecondaryText);
    });
  });
});
