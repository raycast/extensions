# Developer Readme

### Installing local extension

1. clone this repository
2. checkout the version you would like to use (the main branch, or a specific tag)
3. open the cloned repository in a terminal and run `npm i && npm run build`
4. open raycast
5. search `import extension`
6. run the `import extension` command
7. select the cloned repository
8. Now run `npm run dev` command in the cloned repository
9. have fun!

### Lifecycle of a Command

It's very important to await any asynchronous operation within a command. Without doing this, the command will be disposed without completing.

### Resolving command actions

- command `name` in package.json must match filename in `src`

### Publishing updates

1. Update the version in `package.json`
2. Update CHANGELOG
3. run `npm run publish` <-- address any errors
4. This will automatically cut a PR to raycast/extensions and provide a link
5. Edit the PR description to explain changes
6. Wait for approval from Raycast team (can take up to 2 weeks)
