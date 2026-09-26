# DayCal website

The public website lives in `docs/` and is published by GitHub Pages from **main → /docs**. Hosting is free for this public repository. Fasthosts provides domain registration/DNS only; no hosting plan or paid product is required.

The website and extension use the DayCal public name. The repository, OAuth configuration and compatibility identifiers retain their existing names.

## Maintenance

- Edit `docs/index.html` for homepage copy, `docs/assets/styles.css` for layout, and the HTML files in `docs/privacy/` and `docs/security/` for policies.
- Keep the web policies aligned with authoritative `PRIVACY.md` and `SECURITY.md`, adapting the public name and support contact. The web privacy page also describes static GitHub Pages hosting.
- Keep `docs/CNAME` set to `daycal.co.uk`. `.nojekyll` serves the plain static files without Jekyll processing.
- The icon is a reduced copy of the existing public branding asset. Schedule and Menu Bar previews use real screenshots supplied by the maintainer. Replace screenshots with fresh demo captures when visible UI changes; do not paint new branding into captured UI. The Menu Bar capture shows the current DayCal branding. Both screenshots share an accessible enlargement overlay.
- There are no JavaScript dependencies, external fonts, trackers, analytics, cookies or third-party scripts added by the site.
- Preview with `python3 -m http.server 8765 --directory docs`, then visit `http://localhost:8765/`, `/privacy/` and `/security/`.
- Check internal links, mobile/desktop layout and page metadata before publishing. Push site edits to `main`; Pages deploys automatically.
- Repository settings: [GitHub Pages](https://github.com/JonahTweed/CalFlow/settings/pages).

## Fasthosts DNS setup

Values checked against [official GitHub Pages custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) on 13 September 2026. Set the custom domain in GitHub Pages before changing DNS.

In [Fasthosts Control Panel](https://www.fasthosts.co.uk/login), choose **Hosting & Domains → Domain Names → daycal.co.uk → Configure Advanced DNS**. This navigation and the CNAME form are documented in [Fasthosts’ guide](https://www.fasthosts.co.uk/blog/cname-and-alias-records/).

The apex is the bare `daycal.co.uk` host, represented by a blank Host Name in Fasthosts (often written `@` in DNS documentation). Keep the existing/default TTL of 3600 seconds if a TTL field is available.

| Type | Host Name | Points To / value | TTL | Existing record action |
| --- | --- | --- | --- | --- |
| A | blank (apex) | `185.199.108.153` | 3600/default | Replace the apex parking A record `213.171.195.105` |
| A | blank (apex) | `185.199.109.153` | 3600/default | Add alongside the first A record |
| A | blank (apex) | `185.199.110.153` | 3600/default | Add alongside the first A record |
| A | blank (apex) | `185.199.111.153` | 3600/default | Add alongside the first A record |
| CNAME | `www` | `JonahTweed.github.io` | 3600/default | Replace the `www` parking A record `213.171.195.105`; do not retain conflicting `www` A/AAAA/CNAME records |

1. In **A Records**, edit the blank/apex parking record to the first address, then use **Add A Record** for the other three addresses. All four must use the bare domain host.
2. Remove the existing **www** parking A record. In **CNAME Records**, click **Add CNAME Record**, enter `www` as **Host Name** and `JonahTweed.github.io` as **Points To**, then save. Do not include `https://`, `/CalFlow` or any other path.
3. Leave nameservers, MX, TXT, email-related records and unrelated subdomains unchanged. No apex AAAA or CAA records were returned during the initial check; if the configuration has since changed, inspect it before editing.
4. Wait for propagation (GitHub advises that this may take up to 24 hours). Check both the apex A records and the www CNAME.
5. Open GitHub **Settings → Pages**. Confirm the custom domain passes the DNS check. Enable **Enforce HTTPS** when GitHub has issued the certificate; availability can take up to 24 hours.
6. Verify the homepage, privacy and security URLs over HTTPS, and that `www.daycal.co.uk` redirects to the apex.

GitHub recommends the `www` CNAME and automatically redirects it to the configured apex. IPv6 AAAA records are optional; this setup uses the four official IPv4 A records. Do not add wildcard records or purchase Fasthosts hosting.

## Google Search Console and OAuth status

Current release-readiness status as of **18 September 2026**:

- `daycal.co.uk` is verified as a Domain property in Google Search Console using an apex DNS TXT record. Keep the verification TXT record in Fasthosts.
- Google Auth Platform branding is verified for **DayCal**. The application home page is `https://daycal.co.uk/`, the privacy policy is `https://daycal.co.uk/privacy/`, and `daycal.co.uk` is an authorized domain.
- The OAuth user-support email is `daycal.support@gmail.com`. The public/developer contact is `support@daycal.co.uk`, which forwards to the support Gmail account.
- DayCal requests `calendar.events` and `calendar.calendarlist.readonly`. Google approved OAuth verification for the sensitive `calendar.events` scope on 17 September 2026. A fresh-account runtime test then completed without Google’s unverified-app warning.
- Keep the existing OAuth project/client, redirect URIs, audience and scopes unchanged unless a product change genuinely requires them. Adding new sensitive/restricted scopes or materially changing the consent-screen configuration can require a new verification request.
- Do not remove the Search Console verification TXT record after approval.

The OAuth project remains separate from the public product branding and repository name. The website and extension use **DayCal** publicly while compatibility identifiers and repository paths can retain their existing names.

For future maintenance, use [Google Search Console](https://search.google.com/search-console) for domain ownership and [Google Cloud Console](https://console.cloud.google.com/) → **Google Auth Platform** for branding, data access and verification status. Do not create a replacement Cloud project or OAuth client just to change public branding.
