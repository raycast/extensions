# Better Distribution Options

There are better ways to distribute this extension that avoid manual installation steps!

## Option 1: Raycast Store (Private Unlisted Extension) ⭐ RECOMMENDED

**Best for:** Teams that want zero-friction installation

### How it works:
- Submit extension to Raycast Store as "unlisted"
- Only people with the direct link can install it
- One-click installation for team members
- Automatic updates when you publish new versions
- **FREE** and built into Raycast!

### Setup:

1. **Prepare for submission:**
   ```bash
   # Make sure everything is ready
   pnpm run lint
   pnpm run build
   ```

2. **Publish to Raycast Store:**
   ```bash
   pnpm run publish
   ```

   During publishing:
   - Choose "Unlisted" visibility
   - This makes it private - only people with the link can find it
   - It won't appear in public search results

3. **Share the private link with your team:**
   - You'll get a link like: `https://raycast.com/your-username/ahotu-event-search`
   - Share this link internally (Slack, email, wiki)
   - Team members click the link → "Install Extension" → Done! ✅

### Benefits:
- ✅ Zero manual steps for team members
- ✅ Automatic updates
- ✅ Works after computer restarts
- ✅ No dev server needed
- ✅ Professional distribution
- ✅ **FREE!**

---

## Option 2: Raycast Teams (Paid)

**Best for:** Organizations that want centralized management

### Cost: $8/user/month

### Benefits:
- Team admin panel
- Usage analytics
- Centralized extension management
- Automatic distribution to all team members
- SSO integration available

### Setup:
```bash
pnpm run publish --organization your-team-name
```

---

## Option 3: Current Method (Tarball Distribution)

**What you're doing now - only use if you can't publish to Raycast Store**

### Issues with current method:
- ❌ Manual installation steps
- ❌ Requires keeping dev server running OR manually re-importing after restarts
- ❌ Manual updates
- ❌ Potential for installation errors

### When to use:
- Extension contains proprietary code you can't publish
- Need to test before publishing
- Internal security policies prevent external publishing

---

## Recommendation

**Use Option 1 (Raycast Store - Unlisted)** because:

1. **It's free** - no cost
2. **Zero friction** - team members just click a link
3. **Automatic updates** - push updates, everyone gets them
4. **More reliable** - no dev server management
5. **Professional** - looks and works like any other Raycast extension

### Security Note:
Even as "unlisted", the code is technically on Raycast's servers. If this is a concern:
- Review Raycast's privacy policy
- Check with your security team
- Consider obfuscating sensitive strings
- Use environment variables for API keys (which you already do!)

---

## Migration Path: Current → Raycast Store

If you want to switch:

1. **Publish the extension:**
   ```bash
   cd /Users/jules/WorldsSportsGroup/ahotu-site/apps/raycast-ahotu-search
   pnpm run publish
   ```

2. **Choose "unlisted" during publishing**

3. **Get the private link** from Raycast

4. **Share with team:**
   ```
   Hey team! New easy installation method:

   Click this link: https://raycast.com/your-username/ahotu-event-search
   Then click "Install Extension"

   That's it! No more manual installation. Updates will be automatic too.
   ```

5. **Team members who already have it manually:**
   - They can uninstall the manual version
   - Install from the store link
   - Or keep using manual version (will work fine)

---

## Need Help Publishing?

If you want to publish to Raycast Store but need help:

1. Run the publish command:
   ```bash
   pnpm run publish
   ```

2. Follow the prompts:
   - Log in to Raycast account
   - Review extension details
   - Choose "Unlisted" visibility
   - Submit!

3. Raycast may review it briefly (usually instant for unlisted)

4. Share the link with your team

---

## Questions?

**Q: Is unlisted really private?**
A: Yes! Only people with the direct link can see/install it. It won't appear in search.

**Q: Can I update it later?**
A: Yes! Just run `pnpm run publish` again. Updates push to all users automatically.

**Q: What if I want to make it public later?**
A: You can change visibility settings in the Raycast developer dashboard.

**Q: Does it work with our API keys?**
A: Yes! The extension uses Raycast's preferences system - each user sets their own API key locally.

**Q: Can I unpublish it?**
A: Yes, you can unpublish anytime from the Raycast developer dashboard.
