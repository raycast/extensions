import { Account, Budget, Category, Planning, Tag, Transaction } from "./types";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";

const TODAY = new Date();
const CURRENCY = { code: "USD", symbol: "$", fixed: true, rate: 1, main_rate: 1 };

export const MOCK_CATEGORIES: Category[] = [
  { id: "c1", name: "🍔 Food", type: "expense", deleted: false },
  { id: "c2", name: "🚗 Transport", type: "expense", deleted: false },
  { id: "c3", name: "🏠 Rent", type: "expense", deleted: false },
  { id: "c4", name: "🎬 Entertainment", type: "expense", deleted: false },
  { id: "c5", name: "🛍️ Shopping", type: "expense", deleted: false },
  { id: "c6", name: "💰 Salary", type: "income", deleted: false },
  { id: "c7", name: "📈 Investments", type: "income", deleted: false },
];

export const MOCK_TAGS: Tag[] = [
  { id: "t1", name: "Lunch", type: "expense", category: "c1", deleted: false },
  { id: "t2", name: "Dinner", type: "expense", category: "c1", deleted: false },
  { id: "t3", name: "Uber", type: "expense", category: "c2", deleted: false },
  { id: "t4", name: "Subway", type: "expense", category: "c2", deleted: false },
  { id: "t5", name: "Grocery", type: "expense", category: "c1", deleted: false },
  { id: "t6", name: "Freelance", type: "income", category: "c6", deleted: false },
];

export const MOCK_ACCOUNTS: Account[] = [
  { id: "a1", name: "Wallet", order: 0, currency: CURRENCY },
  { id: "a2", name: "Bank Account", order: 1, currency: CURRENCY },
  { id: "a3", name: "Savings", order: 2, currency: CURRENCY },
];

// Generate some random transactions for the current month
const generateTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const start = startOfMonth(TODAY);
  const end = endOfMonth(TODAY);

  // 1. Recurring Rent (Expense)
  transactions.push({
    id: "tx_rent",
    amount: -1200,
    currency: CURRENCY,
    date: format(start, "yyyy-MM-dd"), // 1st of month
    desc: "Monthly Rent",
    account: "a2",
    category: "c3",
    tags: [],
    modified: format(start, "yyyy-MM-dd HH:mm:ss"),
    completed: true,
    deleted: false,
    repeat: {
      id: "rpt_rent",
      frequency: "monthly",
      interval: 1,
      start: format(start, "yyyy-MM-dd"),
    },
  });

  // 2. Salary (Income)
  transactions.push({
    id: "tx_salary",
    amount: 3500,
    currency: CURRENCY,
    date: format(addDays(start, 27), "yyyy-MM-dd"), // 28th of month
    desc: "Monthly Salary",
    account: "a2",
    category: "c6",
    tags: [],
    modified: format(start, "yyyy-MM-dd HH:mm:ss"),
    completed: true,
    deleted: false,
    repeat: {
      id: "rpt_salary",
      frequency: "monthly",
      interval: 1,
      start: format(start, "yyyy-MM-dd"),
    },
  });

  // 3. Random Daily Expenses
  let currentDate = start;
  let idCounter = 1;

  while (currentDate <= end && currentDate <= TODAY) {
    const dateStr = format(currentDate, "yyyy-MM-dd");

    // Coffee/Lunch (High probability)
    if (Math.random() > 0.3) {
      transactions.push({
        id: `tx_${idCounter++}`,
        amount: -(10 + Math.random() * 20), // $10 - $30
        currency: CURRENCY,
        date: dateStr,
        desc: Math.random() > 0.5 ? "Lunch at Cafe" : "Morning Coffee",
        account: "a1",
        category: "c1",
        tags: ["t1"],
        modified: dateStr,
        completed: true,
        deleted: false,
      });
    }

    // Transport (Medium probability)
    if (Math.random() > 0.7) {
      transactions.push({
        id: `tx_${idCounter++}`,
        amount: -(15 + Math.random() * 30), // $15 - $45
        currency: CURRENCY,
        date: dateStr,
        desc: "Uber Ride",
        account: "a2",
        category: "c2",
        tags: ["t3"],
        modified: dateStr,
        completed: true,
        deleted: false,
      });
    }

    currentDate = addDays(currentDate, 1);
  }

  // 4. One large shopping expense (Mid-month)
  transactions.push({
    id: "tx_shopping",
    amount: -350.99,
    currency: CURRENCY,
    date: format(addDays(start, 14), "yyyy-MM-dd"),
    desc: "New Headphones",
    account: "a2",
    category: "c5",
    tags: [],
    modified: format(addDays(start, 14), "yyyy-MM-dd"),
    completed: true,
    deleted: false,
  });

  // Sort by date desc
  return transactions.sort((a, b) => b.date.localeCompare(a.date));
};

export const MOCK_TRANSACTIONS = generateTransactions();

export const MOCK_BUDGETS: Budget[] = [
  {
    id: "bg1",
    name: "Monthly Spending",
    limit: 2000,
    amount: 1450, // Calculated roughly from generated
    planned: 2000,
    currency: CURRENCY,
    from: format(startOfMonth(TODAY), "yyyy-MM-dd"),
    to: format(endOfMonth(TODAY), "yyyy-MM-dd"),
    rollover: false,
    modified: "",
    status: "active",
    type: "regular",
    order: 0,
  },
];

export const MOCK_PLANNING: Planning = {
  avg: {
    expenses: 1800,
    incomes: 3500,
    balance: 1700,
    networth: 15000,
  },
  ranges: {
    expenses: { min: 1200, max: 2500 },
    incomes: { min: 3500, max: 4000 },
    balance: { min: 1000, max: 2800 },
    networth: { min: 10000, max: 20000 },
  },
  planning: [
    {
      from: format(startOfMonth(TODAY), "yyyy-MM-dd"),
      to: format(endOfMonth(TODAY), "yyyy-MM-dd"),
      expenses: { sum: 1450, planned: 2000, predicted: 1900 },
      incomes: { sum: 3500, planned: 3500, predicted: 3500 },
      balance: { sum: 2050, planned: 1500, predicted: 1600 },
    },
  ],
};
