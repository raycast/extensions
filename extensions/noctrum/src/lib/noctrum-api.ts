import { NOCTRUM_SERVER_URL } from "./constants";
import type { BorrowerStatus, CollateralQuote, HealthResponse, LenderStatus } from "./types";
import type { CreditScoreData } from "../hooks/useCreditScore";

async function noctrumGet<T = Record<string, unknown>>(path: string) {
  const res = await fetch(`${NOCTRUM_SERVER_URL}${path}`);
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    console.log(`GET ${path} → ${res.status}`, data);
    throw new Error(
      (data as { error?: string })?.error ||
        `GET ${path} → ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
    );
  }
  return data as T;
}

async function noctrumPost<T = Record<string, unknown>>(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${NOCTRUM_SERVER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    console.log(`POST ${path} → ${res.status}`, data);
    throw new Error(
      (data as { error?: string })?.error ||
        `POST ${path} → ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
    );
  }
  return data as T;
}

// Public reads
export const fetchCreditScore = (address: string) => noctrumGet<CreditScoreData>(`/api/v1/credit-score/${address}`);

export const fetchLenderStatus = (address: string) => noctrumGet<LenderStatus>(`/api/v1/lender-status/${address}`);

export const fetchBorrowerStatus = (address: string) =>
  noctrumGet<BorrowerStatus>(`/api/v1/borrower-status/${address}`);

export const fetchCollateralQuote = (params: {
  account: string;
  token: string;
  amount: string;
  collateralToken: string;
}) =>
  noctrumGet<CollateralQuote>(
    `/api/v1/collateral-quote?account=${params.account}&token=${params.token}&amount=${params.amount}&collateralToken=${params.collateralToken}`,
  );

export const fetchPoolAddress = async (): Promise<string> => {
  const data = await noctrumGet<HealthResponse>("/health");
  return data?.poolAddress;
};

// Writes (signed)
export const initDepositLend = (body: { account: string; token: string; amount: string }) =>
  noctrumPost<{ slotId: string }>("/api/v1/deposit-lend/init", body);

export const confirmDepositLend = (body: {
  account: string;
  slotId: string;
  encryptedRate: string;
  timestamp: number;
  auth: string;
}) => noctrumPost("/api/v1/deposit-lend/confirm", body);

export const cancelLend = (body: { account: string; slotId: string; timestamp: number; auth: string }) =>
  noctrumPost("/api/v1/cancel-lend", body);

export const submitBorrowIntent = (body: {
  account: string;
  token: string;
  amount: string;
  collateralToken: string;
  collateralAmount: string;
  encryptedMaxRate: string;
  timestamp: number;
  auth: string;
}) => noctrumPost("/api/v1/borrow-intent", body);

export const cancelBorrow = (body: { account: string; intentId: string; timestamp: number; auth: string }) =>
  noctrumPost("/api/v1/cancel-borrow", body);

export const acceptProposal = (body: { account: string; proposalId: string; timestamp: number; auth: string }) =>
  noctrumPost("/api/v1/accept-proposal", body);

export const rejectProposal = (body: { account: string; proposalId: string; timestamp: number; auth: string }) =>
  noctrumPost("/api/v1/reject-proposal", body);

export const repayLoan = (body: { account: string; loanId: string; amount: string; timestamp: number; auth: string }) =>
  noctrumPost("/api/v1/repay", body);

export const claimExcessCollateral = (body: { account: string; loanId: string; timestamp: number; auth: string }) =>
  noctrumPost("/api/v1/claim-excess-collateral", body);
