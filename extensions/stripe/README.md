# Stripe Extension for Raycast

Manage multiple Stripe accounts with different environments seamlessly from Raycast!

## ✨ Features

- 🔄 **Multiple Account Support** - Switch between unlimited Stripe accounts
- 🌍 **Test & Live Environments** - Toggle between test and live mode for each account
- 🎨 **Color-Coded Profiles** - Visual distinction for quick identification
- ⚡ **Quick Switching** - Keyboard shortcuts for instant account/environment changes
- 📊 **Full Dashboard Access** - View charges, customers, events, balances, and more
- 💳 **Create Resources** - Generate payment links, coupons, and more

## 🚀 Quick Start

### Step 1: Get Your API Keys

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers → API Keys**
3. Copy your **Secret key** (starts with `sk_test_...` or `sk_live_...`)
   - ⚠️ Use the **Secret key**, not the Publishable key

### Step 2: Configure Your Account

**Option A: Extension Preferences (Single Account)**
1. Open Raycast Settings (`Cmd+,`)
2. Go to **Extensions → Stripe**
3. Enter your API keys:
   - **Test Env API Key**: `sk_test_...`
   - **Live Env API Key**: `sk_live_...`

**Option B: Profile Manager (Multiple Accounts)**
1. Search: **"Manage Stripe Accounts"** in Raycast
2. Click **"Add New Profile"**
3. Fill in your profile details and API keys
4. Save and start using it!

### Step 3: Start Using

1. Search for any Stripe command (e.g., "View Charges")
2. Press `Cmd+Shift+A` to switch accounts
3. Press `Cmd+Shift+E` to toggle Test/Live mode

## 📖 Commands

- **Manage Stripe Accounts** - Add, edit, and switch between profiles
- **View Charges** - See all payment charges
- **View Balance** - Check account balance
- **View Balance Transactions** - Review balance transactions
- **View Payment Intents** - Monitor payment intents
- **View Connected Accounts** - Manage connected accounts
- **View Events** - See webhook events and API activity
- **Manage Customers & Subscriptions** - Search and manage customers
- **Create Coupon** - Generate discount codes
- **Create Payment Link** - Create shareable payment links
- **Fill Checkout** - Auto-fill test card details

## 🔄 Managing Multiple Accounts

### Adding Accounts
1. Open **"Manage Stripe Accounts"**
2. Select **"Add New Profile"**
3. Configure:
   - Profile Name (e.g., "Main Business", "Client A")
   - Test & Live API Keys
   - Optional: Account ID for reference
   - Color for visual identification

### Switching Accounts
- **Keyboard**: `Cmd+Shift+A` → Select account
- **Dropdown**: Use the dropdown in any command's search bar

### Switching Environments
- **Keyboard**: `Cmd+Shift+E` → Toggle Test/Live
- **Dropdown**: Use the environment dropdown

## 💡 Use Cases

### Multiple Businesses
```
Profile 1: "Main Business" (Purple)
Profile 2: "Side Project" (Blue)
Profile 3: "Consulting Gig" (Green)
```

### Development Workflow
```
Profile 1: "Production" (Red) - Live data
Profile 2: "Staging" (Yellow) - Pre-release testing
Profile 3: "Development" (Blue) - Active development
```

### Agency/Freelancer
```
Profile 1: "Client: Acme Corp"
Profile 2: "Client: Tech Startup"
Profile 3: "Client: E-commerce Store"
Profile 4: "Internal Tools"
```

## 🐛 Troubleshooting

### Nothing is Loading?

1. ✅ Check your profile has API keys configured
   - Open "Manage Stripe Accounts"
   - Active profile should show "Test" and/or "Live" tags
   
2. ✅ Verify you're in the correct environment
   - If you only have Test keys, switch to Test mode (`Cmd+Shift+E`)
   - If you only have Live keys, switch to Live mode

3. ✅ Confirm API key format
   - Keys should start with `sk_test_` or `sk_live_`
   - NOT Publishable keys (those start with `pk_`)

### Can't Switch Accounts?

Make sure you have multiple profiles created in **"Manage Stripe Accounts"**

### API Errors?

- Verify keys are copied correctly without extra spaces
- Check keys haven't been revoked in Stripe Dashboard
- Ensure keys have proper permissions

## 📚 Full Setup Guide

For detailed instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## 🔗 Resources

- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Get API Keys](https://dashboard.stripe.com/apikeys)

---

Made with ❤️ for the Raycast community