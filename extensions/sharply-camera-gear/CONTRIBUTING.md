# Development and Store releases

Develop this extension in `nyphotohouse/sharply-raycast`. The Raycast Store distributes the reviewed copy in `raycast/extensions`. Pushing to this repository does not publish a Store update.

## Everyday development

1. Pull the latest changes from this repository.
2. Run `npm install` and `npm run dev`.
3. Edit the extension and test it in Raycast. The development watcher reloads saved changes.
4. Commit and push changes here as usual. Keep the Store release as a separate step when the changes are ready.

Avoid installing multiple development copies from different folders: they can create duplicate commands in Raycast.

## Prepare a release

If the published extension received contributions in `raycast/extensions`, bring those changes into this repository first:

```sh
npx @raycast/api@latest pull-contributions
```

Review the changes, resolve any conflicts, and commit the result. This sync operation changes local files; it is not a read-only diff command. For the initial submission, there is no published copy to sync yet.

Update `CHANGELOG.md` for the release using the Raycast format:

```md
## [Describe the update] - {PR_MERGE_DATE}

- Describe the user-visible changes.
```

Before submitting, run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Test the command in Raycast, including searching, opening gear pages, recent opens, and the price market preference. Check Store metadata and screenshots when relevant. Commit and push the release-ready changes to this repository.

## Submit through the official publisher

From this extension directory, run:

```sh
npm run publish
```

The official Raycast publisher validates the extension and automates the GitHub pull request to `raycast/extensions`. Complete its GitHub authentication prompts when requested. Authentication for `gh` alone does not replace the publisher's sign-in.

Review the resulting PR and respond to Raycast's review feedback. For changes while the submission is open, edit and commit here, rerun validation, then rerun `npm run publish` to update the submission. After a release is merged, submit the next release through the same command.

Raycast publishes the extension to the Store after accepting and merging the PR. An open submission and commits in this repository are not a published release.

Use the official publisher for submissions rather than copying files into a separately maintained fork or using custom GitHub API scripts. It handles the submission workflow; this repository remains the place for everyday development.

## References

- [Publish an extension](https://developers.raycast.com/basics/publish-an-extension)
- [Prepare an extension for the Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Raycast CLI](https://developers.raycast.com/information/developer-tools/cli)
