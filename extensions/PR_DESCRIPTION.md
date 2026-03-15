# [Revcast] Revenue tracking for Stripe SaaS founders

## Extension Details

**Extension Name:** Revcast  
**Author:** bharath  
**Categories:** Finance, Developer Tools  
**License:** MIT

---

## What does Revcast do?

Revcast is a Raycast extension for Stripe-backed SaaS founders who want revenue answers without opening another dashboard.

It provides instant access to:
- **Revenue Snapshot**: Today's revenue, MRR, new customers, and failed payments in 3 seconds
- **Failed Payments**: Review revenue at risk and catch churn before it happens
- **Project Management**: Switch between multiple Stripe accounts from the keyboard
- **License & Billing**: Activate Pro plan for unlimited projects and faster refresh

Perfect for indie SaaS founders ($1K-$100K MRR) who want to stay close to their revenue without dashboard fatigue.

---

## Commands

1. **Revenue Snapshot** (`rev`) - See SaaS metrics instantly
2. **Failed Payments** (`failed`) - Review revenue at risk
3. **Projects** (`projects`) - Manage Stripe projects
4. **License & Billing** (`license`) - Activate Pro

---

## Technical Details

- **Local-first architecture**: Stripe API keys never leave the user's device
- **Intelligent caching**: Short-lived cache (15-30 seconds) reduces API calls
- **Demo mode**: Try the extension without a Stripe key
- **Multi-project support**: Switch between Stripe accounts instantly
- **MRR normalization**: Handles different billing intervals correctly

### Dependencies
- @raycast/api: 1.104.9
- react: 19.0.0

No external npm dependencies beyond Raycast API and React.

---

## Checklist

Before submitting, I have:

- [x] Read and agreed to the Extension Guidelines
- [x] Read and agreed to the Developer Terms
- [x] Used my Raycast username in the author field
- [x] Used MIT license
- [x] Used latest @raycast/api version
- [x] Included package-lock.json
- [x] Ensured no Keychain access
- [x] Ensured no external analytics
- [x] Named extension and commands following Apple Style Guide
- [x] Created custom 512x512px icon
- [x] Captured 7 screenshots (2000x1250px, PNG)
- [x] Included comprehensive README
- [x] Formatted CHANGELOG correctly
- [x] Run `npm run lint` - passes ✅
- [x] Run `npm run test` - all pass ✅
- [x] Run `npm run build` - succeeds ✅
- [x] Tested extension in Raycast app - all commands work ✅
- [x] Verified icon looks good in light/dark mode
- [x] No sensitive data in screenshots (using test Stripe data)

---

## Support & Maintenance

**Support Channels:**
- Email: kumarbharath63@gmail.com
- Twitter: @iam_pbk
- Response Time: < 24 hours

**Maintenance Plan:**
- Monthly updates or as needed
- Bug fixes within 48 hours
- Keep dependencies current

I am committed to maintaining this extension long-term. This is a product I use daily and will continue to improve.

---

## Marketing Plan

Post-acceptance, I will:
1. Announce on Twitter with thread
2. Post on Indie Hackers "Show IH"
3. Update landing page with store badge
4. Email waitlist (200+ subscribers)
5. Launch on Product Hunt (day 30+)

Expected impact:
- Week 1: 100-200 installs
- Month 1: 500-1,000 installs
- Month 3: 2,000+ installs

---

## Why This Extension?

I built Revcast because I was opening Stripe 10+ times daily to check the same 3 numbers. Each check broke my flow and cost context. I wanted a faster way — a 3-second revenue check that lives in Raycast, where I already work.



---

## Unique Value

Unlike the official Stripe extension (navigation helper), Revcast is:
- **Analytics-focused**: Shows calculated metrics, not just links
- **Opinionated**: Curated view of what matters most
- **Fast**: Local-first, cached, optimized
- **Private**: Keys never leave your device

---

## Future Roadmap

If accepted, I plan to add:
- Historical trends (week-over-week, month-over-month)
- Smart alerts for unusual revenue drops
- Churn indicators (cancellations, downgrades)
- Quick actions (email customers from failed payments)

I'll start simple and iterate based on community feedback.

---

## Additional Notes

- All Stripe API keys stored locally in Raycast's encrypted storage
- No backend required for core functionality
- Pro plan uses Dodo Payments for checkout + licensing
- GDPR-friendly (no personal data processing)
- Stripe API Terms of Service compliant

---

## Contact Information

**Primary Contact:**
- Name: Bharath
- Email: kumarbharath63@gmail.com
- Twitter: @iam_pbk
- GitHub: Bharath-code
- Raycast Username: bharath

---

## Thank You!

Thank you for reviewing this submission. I'm excited to contribute to the Raycast ecosystem and help founders stay closer to their revenue without dashboard fatigue.

Looking forward to your feedback!

**Bharath**  
Founder, Revcast
