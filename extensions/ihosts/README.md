<h1 align="center">
  <strong>iHosts</strong>
</h1>
<p align="center">Make hosts management more efficient and easier~</p>

## What can you do with this extension?

1. Quickly enable or disable hosts
2. Support preview, create, edit, delete, import, export host items
3. Organize hosts by folder
4. Support to quickly switch hosts by menu bar

## Enable hosts editing on macOS

Open **iHosts** in Raycast and choose **Enable Hosts Access**. macOS handles
administrator authentication in its system dialog; iHosts does not collect or
store your password. You can cancel and retry without changing hosts content.
macOS may reuse a recent authorization instead of asking for credentials again.

After authorization, iHosts keeps `/etc/hosts` owned by `root:wheel`, restores
standard permissions to `0644`, and adds a read/write ACL for the macOS account
running Raycast. This repairs the older `0777` setting as well. The grant applies
to all processes running as your account, including other apps; other accounts
do not receive a new access grant. Existing unrelated ACL entries are preserved.

The main window continues to the hosts list after access is verified. The menu
bar provides the same enable action. The remote-update command requests access
only when saved hosts exist and safely stops if authorization is canceled.

---

<p align="center">If you enjoy using iHosts and/or want to support me to develop, you can buy me a coffee ☕!</p>

<p align="center">
  <a title="Buy Me A Coffee" href="https://www.buymeacoffee.com/J404">
    <img height="64" style="height: 64px" src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png">
  </a>          
</p>
