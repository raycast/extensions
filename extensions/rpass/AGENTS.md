 # rpass Phase 2 Write Commands

## Rules

* Keep `AGENTS.md` local only. Do not add or commit it to the repository.
* Keep the `/plans/` directory local only. Do not add or commit it to the repository.
* Store local-only ignore rules in `.git/info/exclude`, not in `.gitignore`.


 rpass now supports password-store-compatible write operations. Entries are stored as encrypted .gpg files under the selected password store directory.

 All commands support:

 ```bash
   --store-dir <PATH>
 ```

 to target a specific password store instead of PASSWORD_STORE_DIR or the default ~/.password-store.

 JSON errors

 Commands that support --json return structured errors on stderr:

 ```json
   {
     "error": {
       "code": "entry_not_found",
       "message": "entry does not exist: example/login"
     }
   }
 ```

 Common error codes include:

 - entry_not_found
 - entry_already_exists
 - invalid_entry_name
 - gpg_id_not_found
 - gpg_not_found
 - gpg_encrypt_failed
 - gpg_decrypt_failed

 ────────────────────────────────────────────────────────────────────────────────

 Insert an entry

 ```bash
   rpass insert <entry>
 ```

 Creates a new encrypted entry.

 By default, it reads the secret from the terminal without echoing.

 Useful flags:

 ```bash
   rpass insert <entry> --echo
   rpass insert <entry> --multiline
   rpass insert <entry> --force
   rpass insert <entry> --json
 ```

 Behavior:

 - encrypts content using recipients from the nearest .gpg-id;
 - refuses to overwrite an existing entry unless --force is used;
 - stores the entry as <entry>.gpg.

 JSON success:

 ```json
   {
     "name": "example/login"
   }
 ```

 ────────────────────────────────────────────────────────────────────────────────

 Edit an entry

 ```bash
   rpass edit <entry>
 ```

 Opens the entry in the configured editor, then encrypts the edited content.

 Behavior:

 - decrypts the existing entry if it exists;
 - creates a new entry if it does not exist;
 - encrypts the final content using recipients from the nearest .gpg-id;
 - only writes if the content changed.

 JSON success:

 ```bash
   rpass edit <entry> --json
 ```

 ```json
   {
     "name": "example/login"
   }
 ```

 If content does not change, no success JSON is emitted.

 ────────────────────────────────────────────────────────────────────────────────

 Generate a password

 ```bash
   rpass generate <entry>
   rpass generate <entry> <length>
   rpass generate <entry> --length <length>
 ```

 Generates a random password and inserts it into the store.

 Examples:

 ```bash
   rpass generate example/login
   rpass generate example/login 32
   rpass generate example/login --length 32
 ```

 Behavior:

 - prints the generated password to stdout;
 - stores it as the first line of the encrypted entry;
 - refuses to overwrite an existing entry unless --force is used.

 Options:

 ```bash
   --no-lowercase
   --no-uppercase
   --no-numbers
   --no-symbols
   --symbols <CHARS>
   --force
   --json
 ```

 JSON success:

 ```bash
   rpass generate example/login --json
 ```

 ```json
   {
     "name": "example/login",
     "password": "generated-password"
   }
 ```

 ────────────────────────────────────────────────────────────────────────────────

 Generate a passphrase

 ```bash
   rpass generate <entry> --phrase
 ```

 Generates a memorable passphrase instead of a random password.

 Options:

 ```bash
   --words <WORDS>          # default: 4
   --separator <SEPARATOR>  # default: -
   --capitalize
   --number
   --force
   --json
 ```

 Example:

 ```bash
   rpass generate example/login --phrase --words 5 --separator _ --capitalize --number
 ```

 JSON success:

 ```json
   {
     "name": "example/login",
     "password": "Correct_Horse_Battery_Staple_7"
   }
 ```

 ────────────────────────────────────────────────────────────────────────────────

 Remove an entry

 ```bash
   rpass rm <entry>
 ```

 Removes an encrypted entry.

 For non-interactive usage, use:

 ```bash
   rpass rm --force <entry>
 ```

 Behavior:

 - deletes <entry>.gpg;
 - prunes empty parent directories up to the store root;
 - does not delete directories that still contain other entries, subfolders, .gpg-id, or other files;
 - returns entry_not_found if the entry does not exist.

 JSON success:

 ```bash
   rpass rm --force <entry> --json
 ```

 ```json
   {
     "name": "example/login"
   }
 ```

 ────────────────────────────────────────────────────────────────────────────────

 Move or rename an entry

 ```bash
   rpass mv <old-entry> <new-entry>
 ```

 Moves or renames an entry.

 Examples:

 ```bash
   rpass mv example/login archive/login
   rpass mv Personal/github.com/rxtsel Work/git.example/alice
 ```

 Behavior:

 - moves the encrypted .gpg file without decrypting or re-encrypting;
 - can move directory trees;
 - preserves .gpg-id files inside moved directories;
 - refuses to overwrite an existing destination unless --force is used;
 - prunes empty source directories after moving.

 Overwrite:

 ```bash
   rpass mv --force <old-entry> <new-entry>
 ```

 JSON success:

 ```bash
   rpass mv <old-entry> <new-entry> --json
 ```

 ```json
   {
     "old_name": "old",
     "new_name": "new"
   }
 ```

 ────────────────────────────────────────────────────────────────────────────────

 Entry name rules

 Entry names:

 - must not be empty;
 - use / as separator;
 - must not include .gpg;
 - must not contain . or .. path segments;
 - must not use Windows \ separators.

 Valid:

 ```text
   example/login
   Personal/github.com/rxtsel
   archive/old-login
 ```

 Invalid:

 ```text
   example/login.gpg
   ../secret
   example//login
   example\login
 ```

 ────────────────────────────────────────────────────────────────────────────────

 Non-interactive recommendations

 For integrations, prefer:

 ```bash
   --json
   --store-dir <PATH>
   --force
 ```

 where appropriate.

 Examples:

 ```bash
   rpass generate example/login --length 32 --json --force
   rpass rm example/login --force --json
   rpass mv old/login new/login --force --json

