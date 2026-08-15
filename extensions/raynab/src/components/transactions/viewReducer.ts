import type {
  Filter,
  Group,
  GroupNames,
  SortNames,
  SortTypes,
  sortOrder,
  TransactionViewAction,
  TransactionViewState,
  TransactionDetail,
  TransactionDetailMap,
} from '@srcTypes';

import { nanoid as randomId } from 'nanoid';
import Fuse from 'fuse.js';
import { formatToYnabAmount, isNumberLike } from '@lib/utils';

const VALID_MODIFIERS = ['account', 'amount', 'type', 'category'] as const;
const MODIFIERS_REGEX = new RegExp(
  `(-?(?:${VALID_MODIFIERS.join('|')}):[\\w.'"-\\s]+?)(?=\\s+(?:-?(?:${VALID_MODIFIERS.join('|')}):)|$)`,
  'gi',
);

export function transactionViewReducer(
  state: TransactionViewState,
  action: TransactionViewAction,
): TransactionViewState {
  switch (action.type) {
    case 'reset': {
      const initialItems = action.initialCollection ?? state.initialCollection;
      return {
        filter: null,
        group: null,
        sort: 'date_desc',
        // Keep the current search if it exists
        // This prevents the collection from being out of sync with the
        // search from the user since Raycast doesn't provide it as a controlled input
        search: state.search,
        collection: initialItems,
        initialCollection: initialItems,
        isShowingDetails: state.isShowingDetails,
      };
    }
    case 'group': {
      const { groupBy: newGroup } = action;
      const { collection, group: currentGroup, initialCollection } = state;

      if (newGroup === currentGroup) {
        return {
          ...state,
          collection: initialCollection,
          group: null,
        };
      }

      const groups = Array.isArray(collection)
        ? collection?.reduce(groupToMap(newGroup), new Map())
        : Array.from(collection.values())
            .flatMap((g) => g.items)
            .reduce(groupToMap(newGroup), new Map());

      return {
        ...state,
        group: newGroup,
        collection: groups,
      };
    }
    case 'filter': {
      const { filterBy: newFilter } = action;
      const { filter: currentFilter, group, initialCollection } = state;

      if (newFilter === null || isSameFilter(newFilter, currentFilter)) {
        const collection = group ? initialCollection.reduce(groupToMap(group), new Map()) : initialCollection;
        return {
          ...state,
          collection,
          filter: null,
        };
      }

      const filteredCollection = filterCollectionAndGroup(initialCollection, newFilter, group);

      return {
        ...state,
        filter: newFilter,
        collection: filteredCollection,
      };
    }
    case 'sort': {
      const { sortBy: newSort } = action;
      const { collection, sort: currentSort, group, initialCollection } = state;

      if (newSort === null || newSort === currentSort) {
        const collection = group ? initialCollection.reduce(groupToMap(group), new Map()) : initialCollection;
        return {
          ...state,
          collection,
          sort: 'date_desc',
        };
      }

      const sortFn = sortCollectionBy(newSort);
      const sortedCollection = Array.isArray(collection)
        ? [...initialCollection].sort(sortFn)
        : [...initialCollection].sort(sortFn).reduce(groupToMap(group), new Map());

      return { ...state, sort: newSort, collection: sortedCollection };
    }
    case 'search': {
      const { query } = action;
      const { initialCollection, group } = state;

      // Do not bother matching empty queries
      if (query === '') {
        return {
          ...state,
          search: '',
          collection: filterCollectionAndGroup(initialCollection, state.filter, group),
        };
      }

      // Find the position of a match if it exists
      const modifiersPosition = query.search(MODIFIERS_REGEX);

      // Locate the part of the query which isn't a modifier
      // This assumes that part to be at the beginning of the query
      // TODO Other methods could be used but they are either slower, or require more complex regex
      const nonModifierString = modifiersPosition == -1 ? query : query.substring(0, modifiersPosition).trim();
      const modifiers = query.match(MODIFIERS_REGEX)?.reduce((prev, curr) => {
        // split account:accountName
        const [modifier, value] = curr.toLocaleLowerCase().split(':');

        const isNegative = modifier.startsWith('-');
        const modifierType = modifier.replace('-', '');

        return prev.set(modifierType, { value, isNegative });
      }, new Map());

      const filteredCollection =
        modifiers && modifiers.size > 0 ? initialCollection.filter(filterByModifiers(modifiers)) : initialCollection;

      // If only modifiers exists within the query, do not bother searching for it
      if (nonModifierString === '')
        return {
          ...state,
          collection: filterCollectionAndGroup(filteredCollection, state.filter, group),
          search: query,
        };

      // Search within the reduced collection which satisfies the conditions of the modifiers
      const fuse = new Fuse(filteredCollection, { keys: ['payee_name'], threshold: 0 });

      const newCollection = fuse.search(nonModifierString).flatMap((result) => result.item);

      // Apply previous grouping and filtering to the new collection
      return {
        ...state,
        search: query,
        collection: filterCollectionAndGroup(newCollection, state.filter, group),
      };
    }
    case 'toggleDetails': {
      return {
        ...state,
        isShowingDetails: !state.isShowingDetails,
      };
    }
    default:
      //@ts-expect-error action type does not exist
      throw new Error(`Invalid action type "${action.type}" in transactionViewReducer`);
  }
}

/**
 * Initialize the reducer with the required data.
 */
export function initView({
  filter = null,
  group = null,
  sort = null,
  search = '',
  initialCollection: initialItems,
  isShowingDetails: isShowingDetail = false,
}: TransactionViewState): TransactionViewState {
  return {
    filter,
    group,
    sort,
    search,
    isShowingDetails: isShowingDetail,
    collection: initialItems,
    initialCollection: initialItems,
  };
}

/**
 * Returns a reducer function which groups items in the collection by the original argument.
 */
function groupToMap(groupBy: GroupNames | null) {
  // TODO improve this error
  if (!groupBy) throw 'Not a valid Groupname';

  return function (groupMap: TransactionDetailMap, currentTransaction: TransactionDetail) {
    const groupName = currentTransaction[groupBy] ?? '';

    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, {
        id: `${groupName}-${randomId()}`,
        title: groupName,
        items: [],
      });
    }

    const previousGroup = groupMap.get(groupName) as Group<TransactionDetail>;
    groupMap.set(groupName, { ...previousGroup, items: [...previousGroup.items, currentTransaction] });

    return groupMap;
  };
}

/**
 * Returns a compareFunction which sorts elements in the relevant order
 * taking account of the direction.
 */
function sortCollectionBy(sortOrder: SortNames) {
  const [key, order] = sortOrder.split('_') as [SortTypes, sortOrder];

  return function compareItems(firstEl: TransactionDetail, secondEl: TransactionDetail) {
    const left = key === 'date' ? new Date(firstEl[key]).getTime() : firstEl[key];
    const right = key === 'date' ? new Date(secondEl[key]).getTime() : secondEl[key];

    const sortOrderValue = right === left ? 0 : right > left ? 1 : -1;

    return order === 'desc' || sortOrderValue === 0 ? sortOrderValue : -1 * sortOrderValue;
  };
}

/**
 * Returns a filter function that evaluates transactions based on the provided filter criteria.
 *
 * @param newFilter - Filter object containing key and optional value to filter by.
 * @returns A predicate function that returns true if the transaction matches the filter criteria
 */
function filterCollectionBy(newFilter: Filter) {
  return (item: TransactionDetail) => {
    if (!newFilter) return true;

    if (newFilter.key === 'amount') {
      if (newFilter.value == 'inflow') return item.amount >= 0;
      else if (newFilter.value == 'outflow') return item.amount < 0;
    }

    if (newFilter.key === 'unreviewed') {
      return !item.approved;
    }

    return item[newFilter.key] === newFilter.value;
  };
}

/**
 * Filters a collection of transactions based on a filter and optional grouping.
 *
 * @param collection - Array of transaction details to filter
 * @param filter - Filter criteria to apply to the collection
 * @param group - Optional grouping to apply after filtering
 * @returns Either a filtered array of transactions or a grouped map of filtered transactions
 */
function filterCollectionAndGroup(
  collection: TransactionDetail[],
  filter: Filter,
  group: TransactionViewState['group'],
) {
  return group
    ? (collection.filter(filterCollectionBy(filter)).reduce(groupToMap(group), new Map()) as TransactionDetailMap)
    : collection.filter(filterCollectionBy(filter));
}

/**
 * Discriminates between two filters action values.
 */
function isSameFilter(filterA: Filter, filterB: Filter) {
  if (!filterA && filterB) return false;

  if (filterA && !filterB) return false;

  let isSameObject = false;

  if (filterA && filterB) {
    if (!filterA?.key && !filterB?.key) isSameObject = false;

    isSameObject = filterA.key === filterB.key && filterA.value === filterB.value;
  }

  return isSameObject;
}

type ModifierType = 'account' | 'type' | 'category' | 'amount';
// Narrow this type down depending on modifier type w/ typeguard
type Modifier = Map<ModifierType, { value: string; isNegative: boolean }>;

/**
 * Filters a collection based on search modifiers like account:, type:, amount:, and category:.
 * Except for amount, each modifier can be positive (include matches) or negative (exclude matches).
 * @param modifiers - Map of search modifiers and their values
 * @returns Filter function that returns true if a transaction matches all modifiers
 *
 * @example
 * // Include transactions from "Checking" account
 * account:checking
 *
 * // Exclude transactions from "Savings" account
 * account:savings
 *
 * // Only show inflow transactions
 * type:inflow
 *
 * // Only show transactions in "Groceries" category
 * category:groceries
 */
function filterByModifiers(modifiers: Modifier) {
  return (t: TransactionDetail) => {
    let isMatch = false;

    /* 
      Conceptually the code below is simple
      - identify the modifier used
      - apply the required condition
      - If the modifier is inclusive:
        - only include the items which fulfill the condition
        - otherwise, only include the items that don't
     */
    for (const [modifier, content] of modifiers) {
      const { value, isNegative } = content;
      switch (modifier) {
        case 'type': {
          const { amount } = t;
          switch (value) {
            case 'inflow':
              isMatch = amount >= 0;
              isMatch = isNegative ? !isMatch : isMatch;
              break;
            case 'outflow':
              isMatch = amount < 0;
              isMatch = isNegative ? !isMatch : isMatch;
              break;
            default:
              isMatch = false;
              break;
          }
          break;
        }
        case 'account': {
          const accountName = value.toLowerCase();
          isMatch = t.account_name.toLowerCase().search(accountName) !== -1;
          isMatch = isNegative ? !isMatch : isMatch;
          break;
        }
        case 'category': {
          const categoryName = value.toLocaleLowerCase();
          isMatch = t.category_name != undefined && t.category_name.toLocaleLowerCase().search(categoryName) !== -1;
          isMatch = isNegative ? !isMatch : isMatch;
          break;
        }
        case 'amount': {
          // Don't change the match statement if we can't safely convert to a number
          if (!isNumberLike(value)) break;

          const valueAsMilliUnit = formatToYnabAmount(value);

          isMatch = t.amount === valueAsMilliUnit;
          break;
        }
        default:
          isMatch = false;
          break;
      }
      if (isMatch === false) return false;
    }

    return true;
  };
}
