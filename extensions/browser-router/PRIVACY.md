# Privacy Policy for Browser Router

**Last Updated: September 2026**

Browser Router is engineered with an absolute **privacy-first architecture**. We believe that desktop tools should respect user privacy and operate with zero hidden tracking.

---

## 1. Executive Summary

- **Zero Telemetry**: Browser Router collects **no** telemetry, usage metrics, analytics, or behavioral data.
- **100% Local Execution**: All profile detection, registry inspection, query routing, and browser launching occur entirely on your local Windows machine.
- **No Access to Sensitive Data**: Browser Router **never** reads or accesses your browsing history, saved passwords, authentication cookies, form autofill, or personal downloads.
- **Optional Opt-In Feedback**: The only time network traffic is generated is when you explicitly submit a feedback or bug report through the in-app form (<kbd>Ctrl</kbd> + <kbd>F</kbd>).

---

## 2. Local System Access & Profile Detection

To provide profile-aware browser routing, Browser Router inspects standard Windows registry paths and browser configuration files:

1. **Windows Registry**:
   - Queries HKCU\Software\Clients\StartMenuInternet and HKLM\Software\Clients\StartMenuInternet to locate installed browser binary paths (chrome.exe, msedge.exe, rave.exe, ivaldi.exe, etc.).
2. **Profile Metadata**:
   - Reads the Local State (JSON) and individual profile Preferences files located in standard application data directories (%LOCALAPPDATA%).
   - Extracts only non-sensitive visual metadata:
     - Profile folder directory names (e.g., Default, Profile 1)
     - Profile display names (e.g., "Work", "Personal")
     - Profile avatar icons or image paths to display badges in Raycast
3. **What is NEVER Accessed**:
   - SQLite databases containing cookies (Cookies, Network/Cookies)
   - Login credential databases (Login Data)
   - Browsing history records (History)
   - Windows DPAPI encryption keys or master vaults

---

## 3. Storage & On-Device Persistence

Browser Router utilizes Raycast's native, sandboxed LocalStorage strictly on your local PC to persist:
- Custom profile renames and display titles.
- User-added custom browser profile paths.
- Pinned/favorite profile selections.
- First-run onboarding status.
- Unsent feedback draft text (automatically expires and purges after 15 minutes, or immediately upon submission).

None of this data leaves your machine or syncs to external servers.

---

## 4. Optional In-App Feedback & Discord Relay

When you choose to submit feedback or report a bug via <kbd>Ctrl</kbd> + <kbd>F</kbd>:
- **Data Transmitted**:
  - Selected feedback category (Bug Report, Feature Request, Question, Other)
  - Subject line and description text entered by you
  - Extension version (e.g., 1.0.0)
- **How It Works**:
  - The payload is transmitted securely via HTTPS to an authenticated Cloudflare Worker relay (https://search-router-feedback.kanha01945.workers.dev/).
  - The Cloudflare Worker formats a secure Discord embed and delivers it directly to the developer's community triage channel without exposing Discord webhook credentials in the client code.
  - **No IP Logging**: The relay does not log your IP address, generate tracking cookies, or attach any device fingerprints.
  - **Opt-In Only**: If you do not open the feedback form and submit it, Browser Router makes zero external network requests.

---

## 5. Third-Party Search Engines

When you execute a search query or open a URL, Browser Router passes the target URL directly as a command-line argument to your chosen local browser executable. 
- The target search engine (e.g., Google, DuckDuckGo, Brave Search, Bing, Perplexity, Ecosia, or your custom URL template) is contacted directly by your web browser according to that browser's and search engine's respective privacy policies.

---

## 6. Open Source Verification

Browser Router is completely open source under the permissive [MIT License](LICENSE). You can inspect every line of code, build the extension locally from source, and audit its network and disk activities at any time on GitHub.

---

## 7. Contact

If you have questions, feedback, or security inquiries:
- **GitHub Issues**: Open an issue or discussion on the official GitHub repository.
- **In-App Feedback**: Use the built-in feedback tool (<kbd>Ctrl</kbd> + <kbd>F</kbd>).