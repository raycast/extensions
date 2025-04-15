import { LocalStorage } from '@raycast/api';
import { fetchBudget } from '../lib/api';
import { formatToReadableAmount } from '../lib/utils/transactions';
import type { CurrencyFormat } from '@srcTypes';

interface GetBudgetInput {
  month?: string; // Optional month in YYYY-MM format
}

interface GetBudgetOutput {
  success: boolean;
  month: string;
  note: string;
  income: string;
  budgeted: string;
  activity: string;
  to_be_budgeted: string;
  age_of_money: number;
  error?: string;
  debug?: Error | unknown;
}

export default async function (input: GetBudgetInput = {}): Promise<GetBudgetOutput> {
  try {
    console.log('get-budget tool called with:', input);

    const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
    const activeBudgetId = storedBudgetId?.replace(/["']/g, '');

    if (!activeBudgetId) {
      console.log('No active budget found');
      return {
        success: false,
        month: '',
        note: '',
        income: '0',
        budgeted: '0',
        activity: '0',
        to_be_budgeted: '0',
        age_of_money: 0,
        error: 'No active budget selected. Please select a budget first.',
      };
    }

    const storedCurrency = await LocalStorage.getItem<string>('activeBudgetCurrency');
    const activeBudgetCurrency = storedCurrency ? (JSON.parse(storedCurrency) as CurrencyFormat) : null;
    console.log('Using currency format:', activeBudgetCurrency?.iso_code);

    const budget = await fetchBudget(activeBudgetId);
    if (!budget?.months) {
      console.log('No budget data found');
      return {
        success: false,
        month: '',
        note: '',
        income: '0',
        budgeted: '0',
        activity: '0',
        to_be_budgeted: '0',
        age_of_money: 0,
        error: 'Could not fetch budget data.',
      };
    }

    console.log(`Found ${budget.months.length} months of budget data`);
    console.log(
      'Available months:',
      budget.months.map((m) => m.month),
    );

    // If month is provided, use it; otherwise use current month
    let targetMonthStr: string;
    if (input.month) {
      // Convert YYYY-MM to YYYY-MM-01 format
      targetMonthStr = `${input.month}-01`;
    } else {
      const currentDate = new Date();
      targetMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    }
    console.log('Looking for month:', targetMonthStr);

    const targetMonth = budget.months.find((m) => m.month === targetMonthStr);

    if (!targetMonth) {
      console.log('No month data found');
      return {
        success: false,
        month: '',
        note: '',
        income: '0',
        budgeted: '0',
        activity: '0',
        to_be_budgeted: '0',
        age_of_money: 0,
        error: `Could not find budget data for ${input.month || 'current month'}.`,
      };
    }

    console.log('Found month data:', targetMonth.month);

    const result = {
      success: true,
      month: targetMonth.month,
      note: targetMonth.note || '',
      income: formatToReadableAmount({ amount: targetMonth.income, currency: activeBudgetCurrency }),
      budgeted: formatToReadableAmount({ amount: targetMonth.budgeted, currency: activeBudgetCurrency }),
      activity: formatToReadableAmount({ amount: targetMonth.activity, currency: activeBudgetCurrency }),
      to_be_budgeted: formatToReadableAmount({ amount: targetMonth.to_be_budgeted, currency: activeBudgetCurrency }),
      age_of_money: 0, // TODO: Add age_of_money when available in API response
    };

    console.log('Budget data:', {
      ...result,
      income: targetMonth.income,
      budgeted: targetMonth.budgeted,
      activity: targetMonth.activity,
      to_be_budgeted: targetMonth.to_be_budgeted,
    });

    return result;
  } catch (error) {
    console.error('Error fetching budget:', error);
    return {
      success: false,
      month: '',
      note: '',
      income: '0',
      budgeted: '0',
      activity: '0',
      to_be_budgeted: '0',
      age_of_money: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch budget data',
      debug: error,
    };
  }
}
