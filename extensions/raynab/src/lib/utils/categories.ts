/*
  There are multiple types of goals, the goal shape depends on the type
  As of March 8th 2023, we have the following
  (TB='Target Category Balance', TBD='Target Category Balance by Date', MF='Monthly Funding', NEED='Plan Your Spending')
  - TB: Save a certain amount
  - TBD: Save a certain amount by a certain date -> can be on or off-track
  - MF: Save a certain amount no matter what
  - NEED: Save a certain amount, but be able to spend it along the way on a monthly basis
  - DEBT: More complex. But basically pay the minimum payment (and possibly some extra) every month
*/

import { Color, Icon } from '@raycast/api';
import { CategoryGoalTypeEnum } from 'ynab';
import { formatToReadableAmount } from './transactions';
import type { Category, CurrencyFormat, SaveSubTransactionWithReadableAmounts, TransactionDetail } from '@srcTypes';
import { time } from './time';

type GoalShape = 'underfunded' | 'funded' | 'overspent' | 'neutral';

/**
 * Determine the current state of a category based on its goal progress.
 */
export function assessGoalShape(category: Category): GoalShape {
  // No matter the goal type, if the balance is negative, the goal has been overspent
  if (category.balance < 0) return 'overspent';

  switch (category.goal_type) {
    case CategoryGoalTypeEnum.Tb:
      return category.goal_percentage_complete === 100
        ? 'funded'
        : Number(category.goal_percentage_complete) > 0
          ? 'underfunded'
          : 'neutral';
    case CategoryGoalTypeEnum.Tbd:
    case CategoryGoalTypeEnum.Need:
    case CategoryGoalTypeEnum.Mf:
    case CategoryGoalTypeEnum.Debt:
      return category.goal_percentage_complete === 100 || category.goal_under_funded === 0 ? 'funded' : 'underfunded';
    default:
      return category.budgeted < 0 ? 'overspent' : 'neutral';
  }
}

/**
 * Assign specific colors to each goal shape.
 */
export function displayGoalColor(goalShape: GoalShape) {
  switch (goalShape) {
    case 'neutral':
      return Color.SecondaryText;
    case 'funded':
      return Color.Green;
    case 'underfunded':
      return Color.Yellow;
    case 'overspent':
      return Color.Red;
  }
}

/**
 * Returns a specific icon for each supported goal type.
 */
export function displayGoalType(category: Category) {
  switch (category.goal_type) {
    case CategoryGoalTypeEnum.Tb:
      return Icon.BullsEye;
    case CategoryGoalTypeEnum.Tbd:
      return Icon.Calendar;
    case CategoryGoalTypeEnum.Need:
      return Icon.Cart;
    case CategoryGoalTypeEnum.Mf:
      return Icon.Goal;
    case CategoryGoalTypeEnum.Debt:
      return Icon.BankNote;
    default:
      return Icon.XMarkCircle;
  }
}

/**
 * Formats a category's goal target into a human-readable string based on its goal type.
 * Returns a string describing the goal amount and timing (if applicable).
 *
 * Note: Some goal types were deprecated in November 2024 but are kept for backwards compatibility.
 * @see https://support.ynab.com/en_us/our-2024-update-to-targets-H1sZk8X0a
 *
 * @param category - The category containing goal information
 * @param currency - The currency format to use for the target amount
 * @returns A formatted string describing the goal (e.g. "Budget $3,000 by August 2025")
 */
function formatGoalType(category: Category, currency: CurrencyFormat): string {
  if (!category.goal_type) return 'No Goal';

  const target = formatToReadableAmount({ amount: category.goal_target ?? 0, currency });

  switch (category.goal_type) {
    case CategoryGoalTypeEnum.Tb: {
      return `Budget ${target} anytime`;
    }
    case CategoryGoalTypeEnum.Tbd: {
      const deadline = new Intl.DateTimeFormat('en-us', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(String(category.goal_target_month)),
      );
      return `Budget ${target} by ${deadline}`;
    }
    case CategoryGoalTypeEnum.Need:
      return `Save and spend ${target}`;
    case CategoryGoalTypeEnum.Mf:
      return `Budget ${target} monthly`;
    case CategoryGoalTypeEnum.Debt:
      return 'Pay down ${target} monthly';
    default:
      return 'Goal Unknown';
  }
}

const GOAL_CADENCES_WITH_FREQUENCY = [1, 2, 13];
const GOAL_CADENCES_WITHOUT_FREQUENCY = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14];

export function formatGoalCadenceAndFrequency(category: Category, currency: CurrencyFormat): string {
  if (category.goal_cadence == undefined) {
    return formatGoalType(category, currency);
  }

  const target = formatToReadableAmount({ amount: category.goal_target ?? 0, currency });

  const baseString = `${target}`;

  if (category.goal_cadence === 0) {
    const targetMonth = category.goal_target_month;
    return `${baseString} ${targetMonth ? `by ${time(targetMonth).format('LL')}` : 'once'}`;
  }

  if (GOAL_CADENCES_WITH_FREQUENCY.includes(category.goal_cadence)) {
    const frequency = category.goal_cadence_frequency;

    if (frequency == undefined) {
      return baseString;
    }

    switch (category.goal_cadence) {
      case 1:
        return `${baseString} ${frequency === 1 ? 'monthly' : `every ${frequency} months`}`;
      case 2:
        return `${baseString} ${frequency === 1 ? 'weekly' : `every ${frequency} weeks`}`;
      case 13:
        return `${baseString} ${frequency === 1 ? 'yearly' : `every ${frequency} years`}`;
    }
  }

  if (GOAL_CADENCES_WITHOUT_FREQUENCY.includes(category.goal_cadence)) {
    switch (category.goal_cadence) {
      case 14:
        return `${baseString} every 2 years`;
      default:
        return `${baseString} every ${category.goal_cadence - 1} months`;
    }
  }

  return baseString;
}

export function isSplitTransaction(transaction: TransactionDetail): boolean {
  return transaction.category_name === 'Split' && transaction.subtransactions.length > 0;
}

export function getSubtransacionCategoryname(
  categories: Category[] | undefined,
  subtransaction: SaveSubTransactionWithReadableAmounts,
): string {
  return categories?.find((c) => c.id === subtransaction.category_id)?.name ?? '';
}
