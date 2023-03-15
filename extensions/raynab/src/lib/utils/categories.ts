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
import { Category as ynabCategory } from 'ynab';
import { formatToReadablePrice } from './transactions';
import type { Category, CurrencyFormat } from '@srcTypes';

type GoalShape = 'underfunded' | 'funded' | 'overspent' | 'neutral';

/**
 * Determine the current state of a category based on its goal progress.
 */
export function assessGoalShape(category: Category): GoalShape {
  // No matter the goal type, if the balance is negative, the goal has been overspent
  if (category.balance < 0) return 'overspent';

  switch (category.goal_type) {
    case ynabCategory.GoalTypeEnum.TB:
      return category.goal_percentage_complete === 100
        ? 'funded'
        : Number(category.goal_percentage_complete) > 0
        ? 'underfunded'
        : 'neutral';
    case ynabCategory.GoalTypeEnum.TBD:
    case ynabCategory.GoalTypeEnum.NEED:
    case ynabCategory.GoalTypeEnum.MF:
    case ynabCategory.GoalTypeEnum.DEBT:
      return category.goal_percentage_complete === 100 || category.goal_under_funded === 0 ? 'funded' : 'underfunded';
    default:
      break;
  }

  return 'neutral';
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
    case ynabCategory.GoalTypeEnum.TB:
      return Icon.BullsEye;
    case ynabCategory.GoalTypeEnum.TBD:
      return Icon.Calendar;
    case ynabCategory.GoalTypeEnum.NEED:
      return Icon.Cart;
    case ynabCategory.GoalTypeEnum.MF:
      return Icon.Goal;
    case ynabCategory.GoalTypeEnum.DEBT:
      return Icon.BankNote;
    default:
      return Icon.XMarkCircle;
  }
}

/**
 * Format a goal type into an easily digestible target
 * @example "Budget $3,000 by August 2025"
 */
export function formatGoalType(category: Category, currency: CurrencyFormat): string {
  if (!category.goal_type) return 'No Goal';

  const target = formatToReadablePrice({ amount: category.goal_target ?? 0, currency });

  switch (category.goal_type) {
    case ynabCategory.GoalTypeEnum.TB: {
      return `Budget ${target} anytime`;
    }
    case ynabCategory.GoalTypeEnum.TBD: {
      const deadline = new Intl.DateTimeFormat('en-us', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(String(category.goal_target_month))
      );
      return `Budget ${target} by ${deadline}`;
    }
    case ynabCategory.GoalTypeEnum.NEED:
      return `Save and spend ${target}`;
    case ynabCategory.GoalTypeEnum.MF:
      return `Budget ${target} monthly`;
    case ynabCategory.GoalTypeEnum.DEBT:
      return 'Pay down ${target} monthly';
    default:
      return 'Goal Unknown';
  }
}
