# Shopify Shop

Browse and search products from any public Shopify storefront directly in Raycast.

## Setup

Open the extension preferences and enter your store URL (e.g. `https://mystore.myshopify.com`). The default is a Shopify demo store so you can try the extension immediately without any configuration.

## Commands

### Browse Shop

A grid view of your store's products. Use the collection dropdown to filter by collection. Type in the search bar to search products live via the store's suggest API.

**Actions:**

- `⌘O` — Open product detail
- `⌘C` — Copy product handle

### Search Store

Full-text search across products, pages, collections, and articles.

## Limitations

This extension uses Shopify's [AJAX API](https://shopify.dev/docs/api/ajax) rather than the Storefront API. Most endpoints are officially documented; two are unofficial theme endpoints:

| Endpoint                              | Documented                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/products/<handle>.json`             | ✅ [AJAX API](https://shopify.dev/docs/api/ajax/reference/product)                                    |
| `/products/<handle>.js`               | ✅ AJAX API (returns cent-integer prices)                                                             |
| `/collections/<handle>/products.json` | ✅ AJAX API                                                                                           |
| `/search/suggest.json`                | ✅ [Predictive Search API](https://shopify.dev/docs/api/ajax/reference/predictive-search)             |
| `/recommendations/products.json`      | ✅ [Product Recommendations API](https://shopify.dev/docs/api/ajax/reference/product-recommendations) |
| `/collections.json`                   | ⚠️ unofficial — works on most stores, not guaranteed                                                  |
| `/meta.json`                          | ⚠️ unofficial — used for store currency/locale                                                        |

All endpoints require no API key and are available on any public Shopify storefront. If you see loading errors, the store may not be a public Shopify storefront, or a theme may have overridden one of the unofficial endpoints.

The extension cannot access private or password-protected stores.
