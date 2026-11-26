import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export const LAUNCHER_PATH = join(homedir(), ".cushn", "bin", "cushn-mcp");
const BUNDLE_ID = "kz.cushn.desktop";

export type BudgetStatus = "active" | "archived";

export interface Budget {
  id: string;
  title: string;
  income: number;
  currency: string;
  spent: number;
}

export interface BudgetDetails {
  budget: { id: string; description: string | null; status: BudgetStatus };
  allocations: Allocation[];
}

export interface Allocation {
  id: string;
  categoryName: string;
  percentage: number;
  amount: number;
  spent: number;
  editable: boolean;
}

export interface OverspentAllocation {
  id: string;
  categoryName: string;
  amount: number;
  spent: number;
  budgetId: string;
  budgetTitle: string;
  currency: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  createdAt: number;
}

export interface ExchangeRates {
  exchangeRates: { rates: Record<string, number> } | null;
  attribution: { label: string; url: string };
}

interface Page<T> {
  page: T[];
  isDone: boolean;
  continueCursor: string;
}

export class CushnError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CushnError";
  }
}

export function hasLauncher(): boolean {
  return existsSync(LAUNCHER_PATH);
}

export function openCushn(): Promise<void> {
  return new Promise((resolve, reject) =>
    execFile("open", ["-b", BUNDLE_ID], (error) => (error ? reject(new Error("Couldn't open Cushn")) : resolve())),
  );
}

let session: Promise<Client> | undefined;

function connect(): Promise<Client> {
  session ??= start().catch((error) => {
    session = undefined;
    throw error;
  });
  return session;
}

async function start(): Promise<Client> {
  const transport = new StdioClientTransport({ command: LAUNCHER_PATH, stderr: "pipe" });
  let stderr = "";
  transport.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));

  const client = new Client({ name: "cushn-raycast", version: "1.0.0" });
  client.onclose = () => {
    session = undefined;
  };
  try {
    await client.connect(transport);
  } catch (error) {
    const lastLine = stderr.trim().split("\n").pop();
    throw new Error(lastLine || "Couldn't connect to Cushn", { cause: error });
  }
  return client;
}

export function disconnect(): void {
  const current = session;
  session = undefined;
  current?.then((client) => client.close()).catch(() => undefined);
}

async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = await connect();
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as { type: string; text?: string }[] | undefined;
  const text = content?.[0]?.type === "text" ? (content[0].text ?? "") : "";
  if (result.isError) {
    const match = /^([A-Z_]+): (.*)$/s.exec(text);
    throw match ? new CushnError(match[1], match[2]) : new CushnError("INTERNAL", text || `${name} failed`);
  }
  return JSON.parse(text) as T;
}

export async function listBudgets(status: BudgetStatus = "active"): Promise<Budget[]> {
  const budgets: Budget[] = [];
  let cursor: string | undefined;
  for (;;) {
    const result = await call<Page<Budget>>(status === "active" ? "list_budgets" : "list_archived_budgets", {
      sortBy: "lastActivity",
      sortOrder: "desc",
      numItems: 100,
      ...(cursor ? { cursor } : {}),
    });
    budgets.push(...result.page);
    if (result.isDone) return budgets;
    cursor = result.continueCursor;
  }
}

export function getBudget(budgetId: string): Promise<BudgetDetails> {
  return call<BudgetDetails>("get_budget", { budgetId });
}

export async function listAllocations(budgetId: string): Promise<Allocation[]> {
  const { allocations } = await getBudget(budgetId);
  return allocations.filter((allocation) => allocation.editable);
}

/** Allocation id → its expenses, newest first. */
export async function listExpensesByAllocation(budgetId: string): Promise<Record<string, Expense[]>> {
  const { expensesByAllocation } = await call<{ expensesByAllocation: Record<string, Expense[]> }>("list_expenses", {
    budgetId,
  });
  return Object.fromEntries(
    Object.entries(expensesByAllocation).map(([allocationId, expenses]) => [allocationId, expenses.toReversed()]),
  );
}

export async function listExpenses(budgetId: string, allocationId: string): Promise<Expense[]> {
  return (await listExpensesByAllocation(budgetId))[allocationId] ?? [];
}

/** Allocations of active budgets that spent more than their amount. */
export async function listOverspent(): Promise<OverspentAllocation[]> {
  const { overspent } = await call<{ overspent: OverspentAllocation[] }>("get_home_summary", {});
  return overspent;
}

export function getExchangeRates(): Promise<ExchangeRates> {
  return call<ExchangeRates>("get_exchange_rates", {});
}

export async function createExpense(args: {
  budgetId: string;
  allocationId: string;
  title: string;
  amount: number;
}): Promise<string[]> {
  const { budgetId, allocationId, title, amount } = args;
  const { expenseIds } = await call<{ expenseIds: string[] }>("create_expenses", {
    budgetId,
    allocationId,
    items: [{ title, amount }],
  });
  return expenseIds;
}

export async function deleteExpenses(expenseIds: string[]): Promise<void> {
  await call("delete_expenses", { expenseIds });
}
