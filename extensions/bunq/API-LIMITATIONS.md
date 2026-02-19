# 🚧 API Limitations & Unimplemented Features

> This document tracks bunq API features that are either **impossible to implement** due to Raycast platform constraints, or **not yet implemented** but could be added in the future.

---

## 📱 Raycast Platform Constraints

Raycast extensions operate within a sandboxed environment with specific limitations:

| Constraint | Impact |
|:-----------|:-------|
| 🚫 **No incoming HTTP** | Can manage webhooks, but cannot receive callbacks |
| 💾 **No file system write** | Cannot save files programmatically (browser downloads work) |
| ⏸️ **No background execution** | Cannot run servers or long-polling |
| 🔄 **Ephemeral execution** | Each command invocation starts fresh |
| 🌐 **No browser redirect flow** | Cannot implement OAuth authorization code flow |
| 🔐 **No native biometrics** | Cannot use Touch ID/Face ID for transaction approval |

---

## ❌ Platform-Limited Features

The following bunq API features are limited by Raycast's sandboxed environment:

<details>
<summary><strong>🔔 Webhook/Callback Reception</strong></summary>

**bunq Endpoints:** Notification callbacks sent TO a URL you provide

**Why it can't work:**
Raycast extensions cannot listen for incoming HTTP requests. While we can *manage* webhook subscriptions (create/delete notification filters), we cannot actually receive the webhook payloads.

**Workaround:** Use the bunq app or another service to receive real-time notifications.

</details>

<details>
<summary><strong>🔑 OAuth Authorization Flow</strong></summary>

**bunq Endpoints:**
- `POST /oauth-client`
- OAuth authorize/token endpoints

**Why it can't work:**
OAuth requires redirecting the user to bunq's authorization page in a browser, then receiving a callback at a registered URL. Raycast cannot:
1. Register a callback URL that it can receive requests at
2. Intercept browser redirects

**Workaround:** We use API key authentication instead, which users generate in the bunq app.

</details>

<details>
<summary><strong>📥 Programmatic File System Writes</strong></summary>

**bunq Endpoints:**
- `GET /user/{userID}/monetary-account/{accountID}/customer-statement/{statementID}/content`
- `GET /user/{userID}/monetary-account/{accountID}/export-annual-overview/{id}/content`

**Why it can't work:**
Raycast extensions cannot programmatically write files to the user's file system. Customer statements require an async generation request followed by a content download - we can trigger generation but cannot save the resulting files.

**Current behavior:** Statement requests are submitted, and users are directed to the bunq app to download the generated files.

**What DOES work:** Invoice PDFs and public attachments can be downloaded via browser using `Action.OpenInBrowser` with the attachment URL. The browser handles the actual file download.

</details>

<details>
<summary><strong>📡 Real-Time Push Updates</strong></summary>

**Why it can't work:**
Raycast commands run on-demand and cannot maintain persistent connections (WebSocket) or receive push notifications. Data is only refreshed when the user opens the extension.

</details>

<details>
<summary><strong>📱 QR Code Payment Flow</strong></summary>

**bunq Endpoints:**
- `POST /user/{userID}/token-qr-request-ideal`
- `POST /user/{userID}/token-qr-request-sofort`

**Why it's impractical:**
QR codes for payments are designed to be scanned by mobile devices. Displaying a QR code on the same device running Raycast serves no practical purpose.

</details>

<details>
<summary><strong>🏦 PSD2 / Open Banking Endpoints</strong></summary>

**bunq Endpoints:** AISP, PISP, CBPII (Payment Service Provider endpoints)

**Why it doesn't apply:**
These APIs are for **third-party financial service providers** building banking integrations, not for end-user applications. They require:
- PSD2 licensing
- Regulatory compliance
- Server-side infrastructure

This extension is a consumer client, not a financial service provider.

</details>

<details>
<summary><strong>🏪 Merchant/POS Features</strong></summary>

**bunq Endpoints:**
- `POST /user/{userID}/monetary-account/{accountID}/cash-register`
- `POST /user/{userID}/monetary-account/{accountID}/cash-register/{id}/tab`
- iDEAL/Sofort merchant transactions

**Why it doesn't apply:**
These endpoints are for merchants accepting payments via physical point-of-sale systems or web checkout flows. A desktop Raycast extension is not a merchant terminal.

</details>

<details>
<summary><strong>🧪 Sandbox User Creation</strong></summary>

**bunq Endpoints:**
- `POST /sandbox-user-person`
- `POST /sandbox-user-company`

**Why it's excluded:**
This is a developer/testing feature, not an end-user feature. Developers needing sandbox users should use the bunq API directly or the official SDKs.

</details>

---

## 🔮 Potential Future Features

| Feature | Endpoints | Notes |
|:--------|:----------|:------|
| 🖼️ Avatar Upload | `POST /attachment-public` + `PUT /user` | Requires binary upload handling |

---

## 💡 Implementation Notes

### Session Timeout Handling

bunq sessions expire (typically after 1 week). Currently handled reactively (refresh on 401 error).

**Current limitation:**
- Session expiry time not tracked
- Cannot run background refresh tasks

**Potential improvement:**
Store and check `session_timeout` from session response, warn users when session is about to expire.

---

## 📚 API Reference

| Resource | Link |
|:---------|:-----|
| 📖 bunq Documentation | [doc.bunq.com](https://doc.bunq.com) |
| 📋 OpenAPI Spec | [GitHub](https://github.com/bunq/doc/blob/develop/swagger.json) |

---

<p align="center">
  <em>Last updated: January 2026</em>
</p>
