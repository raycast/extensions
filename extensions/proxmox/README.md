<p align="center">
    <img src="./assets/icon@dark.png" width="150" height="150" />
</p>

# Proxmox

## 🔧 Configuration

1. Server URL: `Enter` the full URL w/ Port e.g. _https://pve.local:8006_
2. Token ID: `Follow` instructions in next section
3. Token Secret: `Follow` instructions in next section

### 🖥️ Multiple Servers

You can manage more than one Proxmox server (e.g. multiple non-clustered nodes) with the **Manage Servers** command:

- The server from the extension preferences (if configured) always shows up as the first server
- Additional servers can be added, edited and removed in **Manage Servers**
- The **Manage VMs** and **Manage Storage** commands show the resources of all configured servers, grouped per server

### 🔐 API

The exact steps may vary based on your Proxmox version. In **8.4.6.**:

1. `Log in`
2. `Click` user dropdown in top right and `select` "TFA"
3. `Select` "API Tokens" using the secondary sidebar
4. `Click` **Add**
5. `Enter` a "Token ID" (e.g. _Raycast_)
6. `Enter` optional comment (e.g. _API Token for Raycast_)
7. `Click` **Add**
8. `Copy` "Token ID" and `Paste` in **Preferences**
9. `Copy` "Secret" and `Paste` in **Preferences**

### Troubleshooting

#### Empty list of VMs/LXCs

If you have an empty list of VMs/LXCs (while your account can see them in Proxmox), check your API token permissions:

> **Privilege Separation**: Unchecked

### HTTPS certificate

You need to setup a trusted certificate to work properly. You can do this by following the instructions here:
https://pve.proxmox.com/wiki/Certificate_Management

You can also add the self-signed certificate to trusted certificates in your OS Keychain. Then select "Keychain" in
"Raycast Settings > Advanced > Certificate", and restart Raycast.
