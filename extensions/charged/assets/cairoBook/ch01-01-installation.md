# Installation

The first step is to install Cairo. We will download Cairo manually, using cairo repository or with an installation script. You’ll need an internet connection for the download.

### Prerequisites

First you will need to have Rust and Git installed.

```bash
# Install stable Rust
rustup override set stable && rustup update
```

Install [Git](https://git-scm.com/).

## Installing Cairo with a Script ([Installer](https://github.com/franalgaba/cairo-installer) by [Fran](https://github.com/franalgaba))

### Install

If you wish to install a specific release of Cairo rather than the latest head, set the `CAIRO_GIT_TAG` environment variable (e.g. `export CAIRO_GIT_TAG=v1.0.0-alpha.6`).

```bash
curl -L https://github.com/franalgaba/cairo-installer/raw/main/bin/cairo-installer | bash
```

After installing, follow [these instructions](#set-up-your-shell-environment-for-cairo) to set up your shell environment.

### Update

```
rm -fr ~/.cairo
curl -L https://github.com/franalgaba/cairo-installer/raw/main/bin/cairo-installer | bash
```

### Uninstall

Cairo is installed within `$CAIRO_ROOT` (default: ~/.cairo). To uninstall, just remove it:

```bash
rm -fr ~/.cairo
```

then remove these three lines from .bashrc:

```bash
export PATH="$HOME/.cairo/target/release:$PATH"
```

and finally, restart your shell:

```bash
exec $SHELL
```

### Set up your shell environment for Cairo

- Define environment variable `CAIRO_ROOT` to point to the path where
  Cairo will store its data. `$HOME/.cairo` is the default.
  If you installed Cairo via Git checkout, we recommend
  to set it to the same location as where you cloned it.
- Add the `cairo-*` executables to your `PATH` if it's not already there

The below setup should work for the vast majority of users for common use cases.

- For **bash**:

  Stock Bash startup files vary widely between distributions in which of them source
  which, under what circumstances, in what order and what additional configuration they perform.
  As such, the most reliable way to get Cairo in all environments is to append Cairo
  configuration commands to both `.bashrc` (for interactive shells)
  and the profile file that Bash would use (for login shells).

  First, add the commands to `~/.bashrc` by running the following in your terminal:

  ```bash
  echo 'export CAIRO_ROOT="$HOME/.cairo"' >> ~/.bashrc
  echo 'command -v cairo-compile >/dev/null || export PATH="$CAIRO_ROOT/target/release:$PATH"' >> ~/.bashrc
  ```

  Then, if you have `~/.profile`, `~/.bash_profile` or `~/.bash_login`, add the commands there as well.
  If you have none of these, add them to `~/.profile`.

  - to add to `~/.profile`:

    ```bash
    echo 'export CAIRO_ROOT="$HOME/.cairo"' >> ~/.profile
    echo 'command -v cairo-compile >/dev/null || export PATH="$CAIRO_ROOT/target/release:$PATH"' >> ~/.profile
    ```

  - to add to `~/.bash_profile`:
    ```bash
    echo 'export CAIRO_ROOT="$HOME/.cairo"' >> ~/.bash_profile
    echo 'command -v cairo-compile >/dev/null || export PATH="$CAIRO_ROOT/target/release:$PATH"' >> ~/.bash_profile
    ```

- For **Zsh**:

  ```zsh
  echo 'export CAIRO_ROOT="$HOME/.cairo"' >> ~/.zshrc
  echo 'command -v cairo-compile >/dev/null || export PATH="$CAIRO_ROOT/target/release:$PATH"' >> ~/.zshrc
  ```

  If you wish to get Cairo in non-interactive login shells as well, also add the commands to `~/.zprofile` or `~/.zlogin`.

- For **Fish shell**:

  If you have Fish 3.2.0 or newer, execute this interactively:

  ```fish
  set -Ux CAIRO_ROOT $HOME/.cairo
  fish_add_path $CAIRO_ROOT/target/release
  ```

  Otherwise, execute the snippet below:

  ```fish
  set -Ux CAIRO_ROOT $HOME/.cairo
  set -U fish_user_paths $CAIRO_ROOT/target/release $fish_user_paths
  ```

In MacOS, you might also want to install [Fig](https://fig.io/) which
provides alternative shell completions for many command line tools with an
IDE-like popup interface in the terminal window.
(Note that their completions are independent from Cairo's codebase
so they might be slightly out of sync for bleeding-edge interface changes.)

### Restart your shell

for the `PATH` changes to take effect.

```sh
exec "$SHELL"
```

## Installing Cairo Manually ([Guide](https://github.com/auditless/cairo-template) by [Abdel](https://github.com/abdelhamidbakhta))

### Step 1: Install Cairo 1.0

If you are using an x86 Linux system and can use the release binary, download Cairo here: <https://github.com/starkware-libs/cairo/releases>.

For everyone else, we recommend compiling Cairo from source as follows:

```bash
# Start by defining environment variable CAIRO_ROOT
export CAIRO_ROOT="${HOME}/.cairo"

# Create .cairo folder if it doesn't exist yet
mkdir $CAIRO_ROOT

# Clone the Cairo compiler in $CAIRO_ROOT (default root)
cd $CAIRO_ROOT && git clone git@github.com:starkware-libs/cairo.git .

# OPTIONAL/RECOMMENDED: If you want to install a specific version of the compiler
# Fetch all tags (versions)
git fetch --all --tags
# View tags (you can also do this in the cairo compiler repository)
git describe --tags `git rev-list --tags`
# Checkout the version you want
git checkout tags/v1.0.0-alpha.6

# Generate release binaries
cargo build --all --release
```

.

**NOTE: Keeping Cairo up to date**

Now that your Cairo compiler is in a cloned repository, all you will need to do
is pull the latest changes and rebuild as follows:

```bash
cd $CAIRO_ROOT && git fetch && git pull && cargo build --all --release
```

### Step 2: Add Cairo 1.0 executables to your path

```bash
export PATH="$CAIRO_ROOT/target/release:$PATH"
```

**NOTE: If installing from a Linux binary, adapt the destination path accordingly.**

### Step 3: Setup Language Server

#### VS Code Extension

- Disable previous Cairo 0.x extension
- Install the Cairo 1 extension for proper syntax highlighting and code navigation.
  Just follow the steps indicated [here](https://github.com/starkware-libs/cairo/blob/main/vscode-cairo/README.md).

#### Cairo Language Server

From [Step 1](#step-1-install-cairo-10-guide-by-abdel), the `cairo-language-server` binary should be built and executing this command will copy its path into your clipboard.

```bash
which cairo-language-server | pbcopy
```

Update the `languageServerPath` of the Cairo 1.0 extension by pasting the path.
