# Tana Changelog

## [Custom supertags and target nodes] - 2024-01-20

Support has been added for custom supertags and custom target nodes.

You can now define supertags via the **Manage Supertags** command, which will submit the note with
the configured supertags. In addition, target nodes may be defined via the **Manage Target Nodes**
command which allow you to submit notes to any node in your workspace. Previously, only `Inbox`
was supported.

See the README for instructions.

## [Fix Compatibility Issues] - 2023-12-08

- Fix 401 error when add note.
- Use `TextField` instead of `TextArea`.
- If you have used this plugin before, you need to update the API token according to the steps mentioned in the [README](./README.md).

## [Initial Version] - 2022-11-25

Initial version code
