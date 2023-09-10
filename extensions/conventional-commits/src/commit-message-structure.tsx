import { Detail } from "@raycast/api";

export default function Command() {
    return (
        <Detail
            markdown="
  ```
  <type>[optional scope]: <description>

  [optional body]

  [optional footer]
  ```
  &nbsp;


  A commit that has `!` after the type/scope or the text **BREAKING CHANGE:** at the beginning of its optional body
  or footer section introduces a breaking API change

  Examples:

  - Commit message with scope
  ```
  build(deps): upgrade packages`
  ```

  - Revert Commit Message
  ```
  revert: let us never again speak of the noodle incident

  Refs: 676104e, a215868
  ```

  - Commit message with `BREAKING CHANGE` footer and `!`
  ```
  chore!: drop support for Node 6

  BREAKING CHANGE: use JavaScript features not available in Node 6.
  ```

  "
        />
    );
}
