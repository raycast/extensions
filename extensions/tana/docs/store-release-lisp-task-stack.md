# Store Release Lisp Task Stack

This document records the release-preparation task stack as data. It is public-safe
and intentionally excludes implementation audit details, live node IDs, personal
tokens, emails, and screenshots from a real workspace.

## Success predicate

```lisp
(success?
  (and (clean-public-release-branch?)
       (author-matches-raycast-username? "leodknuth")
       (no-private-archive?)
       (no-token-or-personal-email?)
       (tests-pass?)
       (lint-pass?)
       (build-pass?)
       (store-preflight-pass?)
       (publish-not-executed-without-final-confirmation?)))
```

## Recursive task stack

```lisp
(defun solve-complex-problem (task-stack)
  (if (null task-stack)
      (return-final-synthesis)
      (let ((current-task (car task-stack))
            (remaining-tasks (cdr task-stack)))
        (process current-task)
        (commit-code current-task)
        (solve-complex-problem remaining-tasks)))))
```

## Concrete release stack

```lisp
'((commit-current-baseline
    :verify (git-status-clean?))

  (create-store-release-branch
    :branch "store-release/tana-local-mcp"
    :verify (current-branch? "store-release/tana-local-mcp"))

  (remove-private-audit-archive
    :why "Raycast Store package must not include local process records or live test identifiers."
    :verify (not (path-exists? "docs/Archive/2026-06-23-tana-raycast-local-mcp-closure")))

  (set-public-author
    :author "leodknuth"
    :why "Raycast Store manifest author must match the publishing Raycast account username."
    :verify (= (:author package-json) "leodknuth"))

  (add-store-preflight
    :why "Make privacy and Store-readiness checks repeatable."
    :verify (npm-run "test:store"))

  (run-quality-gates
    :verify ((npm-ci)
             (npm-test)
             (npm-run "test:store")
             (npm-run "lint")
             (npm-run "build")
             (npm-audit "--audit-level=low")))

  (commit-release-prep
    :verify (git-log-includes? "chore: prepare store release branch"))

  (wait-for-publish-confirmation
    :why "npm run publish opens a real Raycast extension PR."
    :verify (not (published-without-explicit-confirmation?))))
```

## Non-goals

- Do not run `npm run publish` during preparation.
- Do not include personal Tana tokens, personal emails, live node IDs, or audit
  process records in the Store release branch.
- Do not refactor unrelated extension logic.
