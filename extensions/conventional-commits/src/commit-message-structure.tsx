import { Detail } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="
  
  # Conventional Commits
  ## Summary
  [The Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/) is a lightweight convention on top of commit messages. 
  It provides an easy set of rules for creating an explicit commit history; which makes it easier to write automated tools on top of. 
  This convention dovetails with SemVer, by describing the features, fixes, and breaking changes made in commit messages.
  
  ## General Structure
  Below is a typical structure of a commit where `<type>` specifies the commit type inserted by this extension i.e. `feat:` and `<description>` is the description of the change made.

  Commits can also include an optional scope to note the scope of change being introduced.

  ```
  <type>[optional scope]: <description>

  [optional body]

  [optional footer]
  ```

  ## Breaking Changes
  Breaking change commit has a footer containing the text `BREAKING CHANGE:` and a description explaining what the change breaks. Alternatively a `!` can be appended after the type/scope of the commit.
  
  It can be part of any type of commit.
  
  ```
  feat!: allow provided config object to extend other configs

  BREAKING CHANGE: `extends` key in config file is now used for extending other config files
  ```
  
  ## Examples

  ### Commit message with scope
  ```
  build(deps): upgrade packages`
  ```
  
  ### Reverting a commit message
  ```
  revert: let us never again speak of the noodle incident

  Refs: 676104e, a215868
  ```

  ### Commit message with breaking change footer and type suffix
  ```
  chore!: drop support for Node 6

  BREAKING CHANGE: use JavaScript features not available in Node 6.
  ```
  "
    />
  );
}
