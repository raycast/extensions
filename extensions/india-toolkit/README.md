# India Toolkit

Essential Indian utilities for Raycast — GST calculator, IFSC lookup, and PIN code search.

India Toolkit brings three everyday financial and postal utilities into Raycast with zero configuration. Built for Indian users who want fast answers without opening a browser.

---

## Commands

### GST Calculator

Calculate GST on any amount — instantly, as you type.

- Enter an amount and choose a GST rate (0%, 3%, 5%, 12%, 18%, 28%, or custom)
- Toggle between **exclusive** (add GST to base) and **inclusive** (extract GST from total) modes
- Switch between **CGST + SGST** (intra-state) and **IGST** (inter-state) tax types
- Results update live; copy total, base amount, GST amount, or a full breakdown to clipboard
- Remembers your last-used rate and tax type across sessions

### IFSC Lookup

Look up any Indian bank branch by its IFSC code.

- Type an 11-character IFSC code to fetch branch details from the Razorpay IFSC API
- Shows bank, branch, address, city, district, state, MICR, and SWIFT code
- Hides empty fields automatically; opens address directly in Apple Maps
- Caches results — repeat lookups are instant
- Stores your 5 most recent lookups for one-click re-access

### Pincode Lookup

Search Indian PIN codes in two directions.

- **PIN → areas**: type a 6-digit PIN to see all post offices at that code with branch type and delivery status
- **Area → PIN**: type an area name (3+ letters) to find matching post offices and their PIN codes
- Each result shows district, state, and branch type; copy the PIN or full address with one action
- Opens any result in Apple Maps
- Stores your 5 most recent searches

---

## Features

- 🇮🇳 Indian number formatting — amounts displayed in lakhs and crores (e.g. ₹1,25,000.00)
- ⚖️ Correct CGST + SGST split for intra-state transactions
- 🕐 Recent lookups memory across IFSC and Pincode commands
- 🗺 One-tap Apple Maps integration for addresses and post offices
- ✈️ GST Calculator works fully offline — no API required
- 🔓 IFSC and Pincode lookups use free, open APIs with no key or account needed

---

## Data Sources

- **IFSC data** — [Razorpay IFSC API](https://ifsc.razorpay.com)
- **Pincode data** — [India Post Pincode API](https://api.postalpincode.in)

---

## Author

Ankur Roy · [@kur_ankur](https://x.com/kur_ankur)
