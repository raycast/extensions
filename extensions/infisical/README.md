<p align="center">
    <img src="./assets/infisical.png" width="150" height="150" />
</p>

# Infisical

This is a Raycast extension for [Infisical](https://infisical.com/) - _Secrets management on autopilot._

## 🚀 Getting Started

1. **Install extension**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/infisical) OR `install` via Raycast Store

2. **Prepare**: This extension uses [Universal Auth](https://infisical.com/docs/documentation/platform/identities/universal-auth) through a [Machine Identity](https://infisical.com/docs/documentation/platform/identities/machine-identities):

    a. `Navigate` to [Project Members](https://app.infisical.com/organization/projects)

    b. `Click` [Access Control](https://app.infisical.com/organization/access-management?selectedTab=members) from the nav

    c. `Click` [Identities](https://app.infisical.com/organization/access-management?selectedTab=identities) tab

    d. `Click` "Create Identity"

    e. `Enter` "Name" e.g. _Raycast_, `Select` "Role" (preferably Admin) and click `Create`

    f. `Copy` the **ID** and **Secret** and `move` to next section 

3. **Configure**:

    a. **Site URL** - unless you are self-hosting, there is no need to change this from the default of `https://app.infisical.com`

    b. **Organization ID** - `Navigate` to [Organization Settings](https://app.infisical.com/organization/settings), `Copy` ID

    c. **Client ID** - `Paste` using instructions from previous section

    d. **Client Secret** - `Paste` using instructions from previous section

## 🗒️ Note

Once you have successfully authenticated, the extension will attempt to `verify` and `renew` token on each subsequent run; In normal cases the `token` is valid for 30 days so you can `check` "Disable Token Verification" to disable this behavior.

---

Looking for more cool OSS extensions? Try these:

<a title="Install appwrite Raycast Extension" href="https://www.raycast.com/xmok/appwrite"><img src="https://www.raycast.com/xmok/appwrite/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install coolify Raycast Extension" href="https://www.raycast.com/xmok/coolify"><img src="https://www.raycast.com/xmok/coolify/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install dokploy Raycast Extension" href="https://www.raycast.com/xmok/dokploy"><img src="https://www.raycast.com/xmok/dokploy/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install keygen Raycast Extension" href="https://www.raycast.com/xmok/keygen"><img src="https://www.raycast.com/xmok/keygen/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install vanguard-backup Raycast Extension" href="https://www.raycast.com/xmok/vanguard-backup"><img src="https://www.raycast.com/xmok/vanguard-backup/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
