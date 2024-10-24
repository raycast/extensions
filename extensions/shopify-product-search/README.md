# Shopify Product Search Extension for Raycast

This Raycast extension allows you to quickly look up product SKUs and inventory levels from your Shopify store by selecting product titles from any application (e.g store webpage).

## Features

- 🔍 Search products by exact title match
- 📦 View current inventory levels
- 🏷️ Display product SKUs
- 🖼️ Show product images
- 📋 Quick copy SKU with ⌘C
- 🚦 Visual stock level indicators
  - ✅ In Stock (10+ units)
  - ⚠️ Low Stock (1-9 units)
  - ❌ Out of Stock (0 units)

## Prerequisites

Before using this extension, you'll need:

1. A Shopify store
2. Admin API access token (starts with `shpat_`)
3. Your Shopify store name

## Installation

1. Install the extension in Raycast
2. Configure the extension preferences:
   - Enter your Shopify Access Token
   - Enter your store name (without .myshopify.com)

## How to Get Your Shopify Access Token

1. Go to your Shopify admin
2. Navigate to Settings > Apps and sales channels
3. Click on "Develop apps"
4. Create a new app or select an existing one
5. Under "Admin API access scopes", ensure you have:
   - `read_products`
   - `read_inventory`
6. Install the app in your store
7. Copy the Admin API access token (starts with `shpat_`)

## Usage

1. Select/highlight a product title from any application
2. Trigger the extension through Raycast
3. The extension will display:
   - Product image
   - SKU
   - Current inventory level
   - Stock status indicator

### Keyboard Shortcuts

- `⌘C`: Copy product SKU to clipboard

## Troubleshooting

If you encounter issues:

1. Verify your access token has the correct permissions
2. Ensure you're using the correct store name
3. Check that you're selecting the exact product title
4. Verify your Shopify store is accessible

## Support

For issues or feature requests, please visit the GitHub repository.

## Privacy

This extension:
- Only accesses your Shopify store data using your provided credentials
- Does not store any product or inventory data
- Credentials are stored securely in Raycast preferences
