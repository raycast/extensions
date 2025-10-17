# How to Add a Custom Blockchain - User Guide

## For End Users (No Coding Required!)

You can now add any blockchain explorer directly from Raycast with a simple form. No code editing needed!

---

## Quick Start: Adding a Custom Chain

### Step 1: Open List Explorers

1. Open Raycast
2. Type "Multichain Explorer"
3. Select **"List Explorers"**

### Step 2: Add Custom Chain

Press **`⌘ + N`** (Command + N) or select **"Add Custom Chain"** from the actions menu

### Step 3: Fill Out the Form

You'll see a form with these fields:

#### Basic Information (Required)

**Chain Name**
- Example: `Polygon`, `Avalanche`, `Base`
- This is what you'll see in the explorer list

**Explorer Name**
- Example: `PolygonScan`, `SnowTrace`, `BaseScan`
- The name of the block explorer website

**Explorer URL**
- Example: `polygonscan.com`, `snowtrace.io`
- Just the domain, no `https://` or trailing slash

**Chain ID**
- Example: `137` (Polygon), `43114` (Avalanche)
- Find this on [ChainList.org](https://chainlist.org)

**Native Currency Symbol**
- Example: `MATIC`, `AVAX`, `ETH`
- The blockchain's native token symbol

**Is Testnet?**
- Check this box if it's a test network

#### URL Paths (Usually Keep Default)

Most EVM chains use these standard paths:
- Transaction Path: `/tx/`
- Address Path: `/address/`
- Block Path: `/block/`
- Token Path: `/token/`

**Only change these if the explorer uses different paths!**

#### Pattern Matching (Advanced - Optional)

Leave these blank for EVM-compatible chains. Only needed for special blockchains like Solana, Bitcoin, etc.

### Step 4: Save

Click **"Add Chain"** or press `⌘ + Enter`

Done! Your custom chain will now appear in:
- The List Explorers view
- The search dropdown menu
- All search results

---

## Real-World Examples

### Example 1: Adding Polygon

```
Chain Name: Polygon
Explorer Name: PolygonScan
Explorer URL: polygonscan.com
Chain ID: 137
Native Currency: MATIC
Is Testnet: ☐ (unchecked)

[Keep all other fields as default]
```

Press "Add Chain" → Done!

### Example 2: Adding Avalanche

```
Chain Name: Avalanche
Explorer Name: SnowTrace
Explorer URL: snowtrace.io
Chain ID: 43114
Native Currency: AVAX
Is Testnet: ☐ (unchecked)

[Keep all other fields as default]
```

### Example 3: Adding Base

```
Chain Name: Base
Explorer Name: BaseScan
Explorer URL: basescan.org
Chain ID: 8453
Native Currency: ETH
Is Testnet: ☐ (unchecked)

[Keep all other fields as default]
```

### Example 4: Adding a Custom L2

```
Chain Name: My Custom L2
Explorer Name: MyL2Scan
Explorer URL: myscan.io
Chain ID: 12345
Native Currency: MYT
Is Testnet: ☐ (unchecked)

Transaction Path: /transaction/   (if different)
Address Path: /wallet/            (if different)
Block Path: /blocks/              (if different)
```

---

## Finding Chain Information

### Where to Find Chain ID

1. Visit [ChainList.org](https://chainlist.org)
2. Search for your blockchain
3. Copy the "Chain ID" number

OR

1. Visit the blockchain's documentation
2. Look for "Chain ID" or "Network ID"
3. Usually found in the "Add Network to Wallet" section

### Where to Find Explorer URL

1. Visit the blockchain's website
2. Look for "Explorer" or "Block Explorer" link
3. Copy just the domain (e.g., `etherscan.io`)

### Where to Find Currency Symbol

1. Visit CoinGecko or CoinMarketCap
2. Search for the blockchain's native token
3. Copy the ticker symbol (e.g., `ETH`, `MATIC`)

---

## Editing a Custom Chain

1. **List Explorers** → Find your custom chain
2. Press **`⌘ + U`** (Command + U)
3. Edit the form
4. Save changes

Your custom chains have a special indicator showing they're user-added.

---

## Deleting a Custom Chain

1. **List Explorers** → Find your custom chain
2. Press **`⌘ + ⇧ + Delete`** (Command + Shift + Delete)
3. Confirm deletion

⚠️ **Warning**: This cannot be undone!

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ + N` | Add custom chain |
| `⌘ + E` | Configure explorer (paths) |
| `⌘ + U` | Edit custom chain |
| `⌘ + ⇧ + Delete` | Delete custom chain |

---

## Tips & Best Practices

### ✅ Do's

- **Check ChainList.org first** - It has accurate chain IDs
- **Use the official explorer** - Usually found on the blockchain's website
- **Test with a search** - After adding, try searching an address
- **Leave patterns blank** - Unless you know you need them

### ❌ Don'ts

- **Don't include `https://`** - Just the domain name
- **Don't add trailing slash** - Use `etherscan.io`, not `etherscan.io/`
- **Don't guess Chain IDs** - Always verify on ChainList.org
- **Don't modify built-in chains** - Use "Configure Explorer" instead

---

## Troubleshooting

### "Chain ID already exists"

This means a chain with that ID is already added. Either:
- You're trying to add a duplicate
- The chain is already built-in (check List Explorers)

**Solution**: Use a different Chain ID or edit the existing chain

### "Invalid URL format"

The Explorer URL field only accepts domain names.

**Wrong**: `https://etherscan.io/`, `www.etherscan.io`
**Right**: `etherscan.io`

### Search not working

If searches don't work after adding a chain:

1. **Check the URL paths** - Make sure they match the explorer
   - Visit the explorer and check actual URLs
   - Example: `etherscan.io/tx/0x123...` means path is `/tx/`

2. **Verify Chain ID** - Search for a known address on the explorer
   - If it works there but not in Raycast, Chain ID might be wrong

3. **Rebuild** - Sometimes you need to reload:
   - Close Raycast completely
   - Open it again
   - Try the search again

### Icon not showing

Custom chains may not have icons initially. This is normal!

To add an icon:
1. Find an SVG logo for the blockchain
2. Save it to `assets/chain-name.svg` (lowercase, dashes for spaces)
3. Rebuild the extension

---

## Advanced: Non-EVM Chains

For blockchains that don't use Ethereum's address format (like Solana, Bitcoin), you need custom patterns:

### Solana Example

```
Chain Name: Solana
Explorer URL: solscan.io
Chain ID: (use a unique number)

Transaction Path: /tx/
Address Path: /account/  ← Different!

Address Pattern: ^[1-9A-HJ-NP-Za-km-z]{32,44}$
Transaction Pattern: ^[1-9A-HJ-NP-Za-km-z]{87,88}$
```

### Bitcoin Example

```
Chain Name: Bitcoin
Explorer URL: blockchain.com
Chain ID: 8332 (or any unique number)

Transaction Path: /btc/tx/
Address Path: /btc/address/

Address Pattern: ^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$
Transaction Pattern: ^[a-fA-F0-9]{64}$
```

**Note**: These are already built-in! This is just for reference if you need to add similar chains.

---

## FAQ

**Q: Can I add any blockchain?**
A: Yes! As long as it has a web-based block explorer.

**Q: Do I need to know regex?**
A: No, not for EVM-compatible chains. Leave patterns blank.

**Q: Can I add testnets?**
A: Yes! Just check the "This is a testnet" box.

**Q: Will my custom chains sync across devices?**
A: No, they're stored locally. You'll need to add them on each device.

**Q: Can I share my custom chains?**
A: Not yet, but this feature is planned! For now, share the form details with others.

**Q: What if the explorer changes its URL?**
A: Just edit the chain and update the Explorer URL field.

**Q: Can I add multiple explorers for one chain?**
A: Not directly, but you can add the chain twice with different Chain IDs and names (e.g., "Ethereum - Etherscan" and "Ethereum - Blockscout").

---

## Support

If you have issues:
1. Double-check all fields are correct
2. Verify on ChainList.org
3. Try rebuilding: `npm run build`
4. File an issue on GitHub with:
   - Chain name
   - Explorer URL
   - What's not working
   - Screenshots if possible

---

## Coming Soon

- **Import/Export**: Share custom chain configurations
- **Templates**: Pre-made configs for popular chains
- **Auto-detect**: Automatically fill in fields from ChainList API
- **Validation**: Real-time URL and pattern testing
- **Icons**: Upload custom chain icons

---

**Happy exploring!** 🚀

Now you can add any blockchain without touching code!
