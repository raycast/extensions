# Hosts Manager

Point a hostname somewhere else for a while — a staging server, a local container, a service you are migrating — and switch it back when you are done. No editing `/etc/hosts` by hand, no lost entries, no guessing what your file is supposed to look like.

## How it works

Your entries live in two places:

- **Public Configuration** — the entries that are always on. Hosts Manager shows your file as it really is and lets you edit it in place.
- **Profiles** — named sets of entries you switch between. Only one profile can be active at a time, so turning on Staging turns off Production for you.

When you apply a profile, its entries are written into `/etc/hosts` alongside your public configuration. Your system entries and anything you added by hand are never touched — only the part Hosts Manager manages gets rewritten.

## Getting started

1. Open Hosts Manager from Raycast.
2. Create a profile and type the mappings you want, for example `10.0.0.5 api.example.com`.
3. Press `⌘ ↵` to apply it. The change takes effect right away, and the DNS cache is refreshed in the same step.

To turn a profile off again, press `⌘ ↵` on the active one. To change an existing profile without applying it yet, use **Edit Profile** and then **Save & Apply** when you are ready.

## Good to know

- **One admin prompt, once.** The first time Hosts Manager writes to `/etc/hosts`, macOS asks for your password. It will not ask again on that Mac.
- **Safe to experiment.** Saving a profile that is not applied only updates Hosts Manager's own data — your hosts file stays as it was until you apply it.
- **Deleting is deliberate.** Removing the active profile cancels it first, so you always know what ends up in your file.
- **The file is never hidden from you.** The **View Current Hosts File** action shows the real contents of `/etc/hosts`, including everything added outside the extension.

