# Mynumber Generator

A Raycast extension that generates dummy My Numbers (Japanese Individual Numbers) with a valid check digit. Intended for creating test data.

> [!WARNING]
> Generated numbers are random dummies. They pass the check-digit validation but have no relation to any real Individual Number. Any coincidental match with a real number is unintentional.

## Features

- `Generate Mynumbers` command generates any number of dummy My Numbers at once
- Copy the generated numbers to the clipboard, or paste them into the frontmost application (configurable in Preferences)
- Optional hyphen-separated format like `1234-5678-9012` (configurable in Preferences)

## Usage

1. Run `Generate Mynumbers` in Raycast
2. Enter how many numbers to generate as the argument (falls back to the `Default Number of Mynumbers` preference)
3. The generated numbers are copied (or pasted)

## Check Digit

The check digit is calculated according to the formula defined in the Ministry of Internal Affairs and Communications Ordinance No. 85 of 2014:

```
check digit = 11 − ((Σ(n=1..11) Pn × Qn) mod 11)
(0 when the remainder is 1 or less)

Pn: the n-th digit of the 11 base digits, counted from the rightmost digit
Qn: n + 1 when n ≤ 6, n − 5 when n ≥ 7
```

## Development

The toolchain is managed with [mise](https://mise.jdx.dev/) (bun / node).

```sh
mise install       # install bun / node
bun install
bun run dev        # start development mode in Raycast
bun test src       # tests for the check-digit logic
bun run lint       # oxlint
bun run fmt        # oxfmt (fmt:check for check only)
bun run knip       # detect unused dependencies and exports
bun run build      # ray build
```

CI (GitHub Actions) runs fmt:check / lint / knip / test / build. Action versions are pinned to commit SHAs with [pinact](https://github.com/suzuki-shunsuke/pinact).

## Release

Releases are automated with [tagpr](https://github.com/Songmu/tagpr).

1. On every push to main, tagpr creates or updates a release PR (bumping `version` in `package.json`)
2. Merging the release PR creates a `vX.Y.Z` tag
3. The tag push triggers the Release workflow, which builds the extension with `ray build` and creates a GitHub Release with the zipped artifact

tagpr uses a GitHub App token so that the pushed tag triggers workflows (requires the repository variable `TAGPR_APP_ID` and secret `TAGPR_PRIVATE_KEY`).

## License

MIT
