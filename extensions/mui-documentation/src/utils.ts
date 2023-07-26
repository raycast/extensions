import { getPreferenceValues } from '@raycast/api';
import algoliasearch from 'algoliasearch';

import { Hit, ListItem, Preferences, ProductName } from './types';

const appId = 'TZGZ85B9TB';
const apiKey = '8177dfb3e2be72b241ffb8c5abafa899';
const client = algoliasearch(appId, apiKey);

/**
 * See more: [Algolia Client](https://www.algolia.com/doc/api-client/getting-started/update/javascript/?client=javascript#the-search-client)
 */
export const algoliaIndex = client.initIndex('material-ui');

/**
 * Prepares a filter string based on the library parameter.
 * @param {string} library - The MUI library name.
 * @returns {string} The filter string in SQL syntax.
 */
const prepareFilterString = (library: string) => {
  return library === 'mui-x'
    ? 'productId:data-grid OR productId:date-pickers'
    : `productId:${library}`;
};

/**
 * Prepares a filter string based on a dropdown value and
 * preference values.
 * @param {string} dropdownValue - The value selected from the dropdown.
 * @returns {string} The filter string in SQL syntax.
 *
 * See more: [Filters and facet filters](https://www.algolia.com/doc/guides/managing-results/refine-results/filtering/in-depth/filters-and-facetfilters/)
 * @example
 * prepareFilters('preferences')
 * // => 'productId:material-ui OR productId:data-grid'
 */
export const prepareFilters = (dropdownValue: string) => {
  const preferences = getPreferenceValues<Preferences>();

  if (dropdownValue === 'preferences') {
    return Object.keys(preferences)
      .reduce<string[]>((acc, curr) => {
        if (preferences[curr as keyof Preferences] === true) {
          acc.push(prepareFilterString(curr));
        }

        return acc;
      }, [])
      .join(' OR ');
  } else if (dropdownValue === 'all') {
    return Object.keys(preferences)
      .map((key) => prepareFilterString(key))
      .join(' OR ');
  } else {
    return prepareFilterString(dropdownValue);
  }
};

/**
 * Prepares a subtitle by omitting the root hierarchy level and
 * concatenating the remaining levels with a separator.
 * @param {Object} hierarchy - The `hierarchy` property from a search result.
 * @returns {string} The formatted subtitle.
 * @example
 * prepareSubtitle(hierarchy)
 * // => '> Accessability'
 */
const prepareSubtitle = (hierarchy: Hit['hierarchy']) => {
  // Omit root hierarchy level for subtitles to avoid duplication
  // with titles.
  const { lvl0, ...rest } = hierarchy;
  const subtitle = Object.values(rest).reduce((acc, curr, index) => {
    if (!curr || index === 0) return acc;
    else if (index > 1) return `${acc}   >   ${curr}`;
    else return `>   ${curr}`;
  }, '');

  return subtitle;
};

/**
 * Formats a product name for display.
 * @param {string} product - The MUI product name.
 * @returns {string} The formatted display name.
 */
const formatProductName = (product: Hit['productId']) => {
  switch (product) {
    case 'base':
      return 'Base UI';
    case 'data-grid':
    case 'date-pickers':
      return 'MUI X';
    case 'joy-ui':
      return 'Joy UI';
    case 'material-ui':
      return 'Material UI';
    case 'system':
      return 'MUI System';
    default:
      return '';
  }
};

/**
 * Formats a list section title for display. Section title are based on the
 * root hierarchy level value of a search result.
 * @param {string} str - The section title string.
 * @returns {string} The formatted display name.
 */
const formatSectionTitle = (str: string) => {
  return str
    .replace('&amp;', '&')
    .replace(
      /^(Data Grid|Date and Time Pickers)(.*)$/,
      (_match, p1, p2) => p1 + (p2 ? ` > ${p2}` : ''),
    );
};

/**
 * Prepares search results by grouping them into sections and limiting
 * the number of results per section.
 * @param {Hit[]} results - The array of search results
 * @returns {Record<string, ListItem[]>} The formatted search results grouped by their root hierarchy level.
 */
export const prepareResults = (results: Hit[]) => {
  const { limit } = getPreferenceValues<Preferences>();

  return results.reduce<Record<string, ListItem[]>>((acc, curr) => {
    const section = formatSectionTitle(curr.hierarchy.lvl0);

    if (!acc[section]) {
      acc[section] = [];
    }
    // Limit each section to a maximum number of results to display.
    // This acts as a frontend alternative to `distinct`.
    if (acc[section].length < Number(limit === 'all' ? 100 : limit)) {
      const { hierarchy = {}, objectID, productId, url } = curr;

      // Omit results for nested 'Component API' hits, for example:
      // Alert API > Import
      if (section === 'Component API' && hierarchy.lvl2) return acc;

      const item = {
        objectID,
        product: formatProductName(productId) as ProductName,
        subtitle: prepareSubtitle(hierarchy),
        title: hierarchy.lvl1,
        url,
      };

      acc[section].push(item);
    }

    return acc;
  }, {});
};

const packageMap = {
  'Material UI': 'mui-material',
  'Joy UI': 'mui-joy',
  'Base UI': 'mui-base',
  'MUI System': 'mui-system',
};

const isMaterialPackage = (
  product: ProductName,
): product is Exclude<ProductName, 'MUI X'> => {
  if (product in packageMap) return true;
  else return false;
};

/**
 * Returns a GitHub URL for a given Material UI component.
 * @param {ProductName} product - The formatted MUI product name.
 * @param {string} title - The component title.
 * @returns {string} The GitHub URL.
 */
export const getSourceUrl = (product: ProductName, title: string) => {
  const baseURL = 'https://github.com/mui/material-ui/blob/master/packages/';
  // Remove all characters after component name, for example
  // 'DialogTitle API' => 'DialogTitle'
  const component = title.replace(/^(\w+)(\s.+)$/, '$1');
  const suffix =
    product === 'Material UI' || product === 'MUI System' ? 'js' : 'tsx';

  if (isMaterialPackage(product)) {
    return `${baseURL}/${packageMap[product]}/src/${component}/${component}.${suffix}`;
  } else {
    return 'https://github.com/mui/material-ui';
  }
};

/**
 * Determines if a given search result should include the
 * "View Source Code" action.
 * @param {ProductName} product - The formatted MUI product name.
 * @param {string} section - The formatted section title.
 * @returns {boolean} A boolean value.
 */
export const showSourceAction = (product: ProductName, section: string) => {
  if (product in packageMap) {
    // This is by no means bullet-proof, but anything that slips through and
    // is not a MUI component should be easily identified as such by the user 🤞
    return section === 'Components' || section === 'Component API';
  } else {
    return false;
  }
};
