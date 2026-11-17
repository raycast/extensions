default:
    @just --list --unsorted

install:
    npm ci
    lefthook install

dev:
    npm run dev

test:
    npm test

check: test
    #!/usr/bin/env bash
    set -euo pipefail
    out=$(mktemp -d)
    trap 'rm -rf "$out"' EXIT
    npx ray build --non-interactive --exit-on-error -e dist -o "$out"
    npx ray lint --non-interactive

fmt:
    npx prettier --write .
    nixfmt flake.nix
