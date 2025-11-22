// this interface is copied from https://raw.githubusercontent.com/kagisearch/bangs/refs/heads/main/data/bangs.schema.json

/**
 * Interface representing a Kagi Search bang definition.
 * This interface is derived from and must stay in sync with the Kagi Bangs JSON Schema.
 * Any changes to this interface should only be made when the official Kagi Bangs schema is updated.
 *
 * @see {@link https://raw.githubusercontent.com/kagisearch/bangs/refs/heads/main/data/bangs.schema.json}
 */
export interface SearchEngine {
  /** The name of the website associated with the bang. */
  s: string;
  /** The domain name of the website. */
  d: string;
  /** The domain of the actual website if the bang searches another website, if applicable. */
  ad?: string;
  /** The specific trigger word or phrase used to invoke the bang. */
  t: string;
  /** The URL template to use when the bang is invoked, where `{{{s}}}` is replaced by the user's query. */
  u: string;
  /** The category of the website, if applicable. */
  c?: (typeof BANG_CATEGORIES)[number];
  /** The subcategory of the website, if applicable. */
  sc?: string;
  /** The format flags indicating how the query should be processed. */
  fmt?: (typeof BANG_FORMATS)[number][];
  /** Whether specs should be run on this bang */
  skip_tests?: boolean;
  /** Whether the search engine is a custom user-defined engine */
  isCustom?: boolean;
}

export const BANG_CATEGORIES = [
  "Entertainment",
  "Man Page",
  "Multimedia",
  "News",
  "Online Services",
  "Region search",
  "Research",
  "Shopping",
  "Tech",
  "Translation",
] as const;

export const BANG_FORMATS = ["open_base_path", "url_encode_placeholder", "url_encode_space_to_plus"] as const;
