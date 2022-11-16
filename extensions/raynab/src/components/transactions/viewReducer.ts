import type {
  Filter,
  Group,
  GroupNames,
  SortNames,
  SortTypes,
  sortOrder,
  ViewAction,
  ViewState,
  TransactionDetail,
  TransactionDetailMap,
} from '@srcTypes';

import { nanoid as randomId } from 'nanoid';
import Fuse from 'fuse.js';

const MODIFIERS_REGEX = /(-?(?:account|type|category):[\w-]+)/g;

export function transactionViewReducer(state: ViewState, action: ViewAction): ViewState {
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
      const { collection, filter: currentFilter, group, initialCollection } = state;

      if (newFilter === null || isSameFilter(newFilter, currentFilter)) {
        const collection = group ? initialCollection.reduce(groupToMap(group), new Map()) : initialCollection;
        return {
          ...state,
          collection,
          filter: null,
        };
      }

      const filteredCollection = Array.isArray(collection)
        ? initialCollection.filter(filterCollectionBy(newFilter))
        : // TODO improve performance. Most .reduce calls could be replaced by for loops (?)
          initialCollection.filter(filterCollectionBy(newFilter)).reduce(groupToMap(group), new Map());

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
      const { initialCollection } = state;

      // Do not bother matching empty queries
      if (query === '') return { ...state, collection: initialCollection, search: '' };

      // Find the position of a match if it exists
      const modifiersPosition = query.search(MODIFIERS_REGEX);

      // Loacte the part of the query which isn't a modifier
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
      if (nonModifierString === '') return { ...state, collection: filteredCollection, search: query };

      // Search within the reduced collection which satisfies the conditions of the modifiers
      const fuse = new Fuse(filteredCollection, { keys: ['payee_name'], threshold: 0 });

      const newCollection = fuse.search(nonModifierString).flatMap((result) => result.item);

      return {
        ...state,
        search: query,
        collection: newCollection,
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
}: ViewState): ViewState {
  return {
    filter,
    group,
    sort,
    search,
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
    groupMap.set(groupName, { ...previousGroup, items: [...previousGroup?.items, currentTransaction] });

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

function filterCollectionBy(newFilter: Filter) {
  return (item: TransactionDetail) => {
    if (!newFilter) return true;

    if (newFilter.key === 'amount') {
      if (newFilter.value == 'inflow') return item.amount >= 0;
      else if (newFilter.value == 'outflow') return item.amount < 0;
    }

    return item[newFilter.key] === newFilter.value;
  };
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

type ModifierType = 'account' | 'type' | 'category';
// Narrow this type down depending on modifier type w/ typeguard
type Modifier = Map<ModifierType, { value: string; isNegative: boolean }>;

/**
 * Given a set of positive or negative modifiers, this function filters the collection for items
 * that match them.
 * Each modifier is only applied once to the collection.
 * */
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
          const accountName = value.toLowerCase().replace('-', ' ');
          isMatch = t.account_name.toLowerCase().search(accountName) !== -1;
          isMatch = isNegative ? !isMatch : isMatch;
          break;
        }
        case 'category': {
          const categoryName = value.toLocaleLowerCase().replace('-', ' ');
          isMatch = t.category_name != undefined && t.category_name.toLocaleLowerCase().search(categoryName) !== -1;
          isMatch = isNegative ? !isMatch : isMatch;
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
