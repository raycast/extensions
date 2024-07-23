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
