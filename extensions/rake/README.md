# Rake

Search and run Rake tasks from Raycast on macOS.
The extension lists the tasks returned by `rake -T` in your home directory and provides a form for tasks that accept arguments.

[日本語](README.ja.md)

## Requirements and Setup

- Raycast for macOS.
- Ruby and Rake available in the `PATH` inherited by Raycast.
- Tasks listed by `rake -T` when run from your home directory.

For example, add a task with a description to `~/Rakefile`:

```ruby
desc "Greet someone"
task :greet, [:name] do |_, args|
  puts "Hello, #{args[:name] || 'world'}!"
end
```

Confirm that Rake can list the task in your terminal:

```sh
cd ~
rake -T
```

The extension invokes `rake` directly without starting a shell or loading shell configuration files.
If Ruby or Rake is available only through shell initialization, such as a Ruby version manager, the extension may not find it even if it works in your terminal.
Ensure that Raycast's `PATH` includes the executable directories required by your Ruby installation.

## Usage

1. Open **Run Rake Task** in Raycast and search for a task.
2. Select a task without arguments and press Enter to run it.
3. For a task with arguments, press Enter to open the form, enter the values, and submit **Run Rake Task**.

A toast shows progress and whether the task succeeded or failed.
On success, the toast displays standard output, falling back to standard error or `Done` if no output is available.
For long output, only the final portion is retained for the toast, with an omission notice; output volume does not stop the task.

Use **Reload Tasks** or `⌘R` from a task's action panel after changing your tasks.
If the task list is empty, reopen the command to reload it.

## Limitations

- All tasks run from your home directory. Selecting a project directory is not supported.
- Only tasks included in `rake -T` are listed. Add `desc` to tasks that should appear.
- Argument values containing commas are not supported because arguments are passed in Rake's comma-separated task syntax.
- Tasks run in the background with captured output. Interactive terminal input is not supported.

## Local Installation and Development

Development requires Node.js 22.22.2 or later and npm.
Store users do not need to install Node.js or npm separately.

```sh
git clone https://github.com/kdmsnr/raycast_rake.git
cd raycast_rake
npm ci
npm run build
```

Open **Import Extension** in Raycast and select the cloned directory containing `package.json`.
Then open **Run Rake Task**.

```sh
npm run dev      # Start Raycast development mode
npm run build    # Compile and type-check into dist/
npm test         # Run parser and subprocess tests without Raycast or GUI interaction
npm run lint     # Validate the manifest, icon, source code, and formatting
npm run fix-lint # Fix supported lint and formatting issues
```

The build command writes to `dist/` without opening or refreshing Raycast.
The command implementation is in `src/rake.tsx`, and the extension manifest is in `package.json`.

## Publishing

Before submitting, confirm that the manifest's `author` matches your Raycast username, update `CHANGELOG.md`, and add Store screenshots to `metadata/`.
Screenshots must be 2000 × 1250 PNGs; Raycast recommends at least three.
Capture them manually using Raycast's Window Capture with **Save to Metadata** enabled.

```sh
CI=true npm run lint
npm run build
```

Commit the prepared changes, then submit the extension:

```sh
npm run publish
```

The publish command authenticates with GitHub and opens a pull request in `raycast/extensions`.
The manifest's `name` is `rake`, so a new submission is placed in `extensions/rake/` regardless of the local checkout's directory name.
After review and merge, the extension becomes available in the Store.

See Raycast's [publishing guide](https://developers.raycast.com/basics/publish-an-extension) and [Store preparation guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store).

## License

[MIT](LICENSE)
