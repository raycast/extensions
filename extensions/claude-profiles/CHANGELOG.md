# Claude Profiles Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Switch Profile lists profiles from the registry shared with the `claude-profiles` CLI, with a "Running" tag for any open window
- Pass a profile name or id as the command's argument to open it directly, or use it to pre-filter the list
- Per profile: open Claude, create a quicklink, rename, show in Finder, copy the data directory path, remove from the list, or move the profile and its data to the Trash, recoverable from there
- Folders not in the list appear in their own section, with options to restore, show in Finder, or move to the Trash
- Create Profile takes a name and an option to open immediately, and offers to restore a removed profile's folder instead of creating a duplicate
- `profiles.json` is written atomically; a broken file is reported without touching any profile folder
