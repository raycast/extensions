import { List } from '@raycast/api';

export interface Preferences {
  /**
   * If `true`, results from the Base UI library will be included in the
   * search results.
   */
  base: boolean;
  /**
   * If `true`, results from the Joy UI library will be included in the
   * search results.
   */
  'joy-ui': boolean;
  /**
   * The maximum number of search results to include per list section.
   */
  limit: '5' | '10' | 'all';
  /**
   * If `true`, results from the Material UI library will be included in
   * the search results.
   */
  'material-ui': boolean;
  /**
   * If `true`, results from the MUI X library will be included in the
   * search results.
   */
  'mui-x': boolean;
  /**
   * If `true`, results from the MUI System library will be included in
   * the search results.
   */
  system: boolean;
}

export interface Hit {
  /**
   * The URL of the web documentation page for a search result, including an
   * optional `#anchor` parameter.
   */
  anchor: string;
  /**
   * An object specifying hierarchy levels that correlate to sections on a
   * given documentation page.
   */
  hierarchy: { [key: string]: string };
  /**
   * A unique identifier.
   */
  objectID: string;
  /**
   * A MUI library name.
   */
  productId:
    | 'base'
    | 'data-grid'
    | 'date-pickers'
    | 'joy-ui'
    | 'material-ui'
    | 'system';
  /**
   * The URL of the web documentation page for a search result.
   */
  url: string;
}

export interface ListItem {
  /**
   * The unique identifier.
   */
  objectID: string;
  /**
   * A formatted display name of a MUI library.
   */
  product: ProductName;
  /**
   * A subtitle that references a nested section of a documentation page.
   */
  subtitle: string;
  /**
   * The display title of a search result, typically the component name or
   * its API reference.
   */
  title: string;
  /**
   * The URL of the web documentation page for a search result.
   */
  url: string;
}

export type ProductName =
  | 'Material UI'
  | 'Joy UI'
  | 'Base UI'
  | 'MUI System'
  | 'MUI X';

export type DropdownOptions =
  | 'all'
  | 'preferences'
  | Exclude<keyof Preferences, 'limit'>;

export interface ProductDropDownProps {
  /**
   * Callback triggered when the dropdown selection changes.
   */
  onChange: List.Dropdown.Props['onChange'];
}

export interface ResultsProps {
  /**
   * The returned results for a given search query.
   */
  data: Record<string, ListItem[]>;
}
