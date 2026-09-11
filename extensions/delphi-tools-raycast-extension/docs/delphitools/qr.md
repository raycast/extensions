# qr

Generate styled QR codes.

## Raycast commands

This Tool should be exposed as two Raycast Commands:

- `QR Code Generator`
- `QR Code Generator vCard`

`QR Code Generator` should use a `Form` for single QR generation. It should
mirror the web UI workflow where the user enters content, adjusts basic options,
and previews the generated QR code. Only CLI-backed options should ship in v1.

`QR Code Generator vCard` should use a separate `Form` that builds vCard text
locally, then passes that text into the same `delphitools qr` generation flow.

Both commands should write a temporary PNG and show a `Detail` preview. They
should not ask for a save path in v1.

## Inputs

- `DATA` required: data to encode.

## Options

- `--size <SIZE>`: output size in pixels; default `512`.
- `--fg <FG>`: foreground colour; default `#000000`.
- `--bg <BG>`: background colour or `transparent`; default `#ffffff`.
- `--logo <LOGO>`: optional centered PNG logo.
- `--error-level <ERROR_LEVEL>`: `L`, `M`, `Q`, or `H`; default `M`.
- Global: `--json`, `--quiet`, `--output`.

## Output

QR code image.

## Generate QR Code parameters

- `data`: required text area for the encoded content. Seed from selected text or clipboard when available.
- `size`: numeric text field; default `512`.
- `foreground`: colour text field; default `#000000`.
- `background`: colour text field accepting a colour or `transparent`; default `#ffffff`.
- `logo`: optional PNG file picker for a centered logo.
- `errorLevel`: dropdown with `L`, `M`, `Q`, and `H`; default `M`.

## Generate QR Code vCard parameters

- `firstName`: optional text field.
- `lastName`: optional text field.
- `organization`: optional text field.
- `jobTitle`: optional text field.
- `email`: optional text field.
- `phone`: optional text field.
- `website`: optional text field.
- `address`: optional text field.
- `size`: numeric text field; default `512`.
- `foreground`: colour text field; default `#000000`.
- `background`: colour text field accepting a colour or `transparent`; default `#ffffff`.
- `logo`: optional PNG file picker for a centered logo.
- `errorLevel`: dropdown with `L`, `M`, `Q`, and `H`; default `M`.

## Raycast actions

- `Generate QR Code`: run `delphitools qr --quiet --output <temp-file>` with the chosen parameters.
- `Open QR Code Image`: open the generated temporary PNG.
- `Copy QR Code Image`: copy the generated image file to the clipboard.
- `Copy QR Code Image Path`: copy the temporary PNG path.
- `Copy QR Code Data`: copy the source data.
- `Copy vCard Text`: copy the generated vCard text from the vCard command.

## vCard format

The vCard command should compose vCard 3.0 text locally, then pass that string as
`DATA` to `delphitools qr`.

```text
BEGIN:VCARD
VERSION:3.0
N:lastName;firstName;;;
FN:firstName lastName
ORG:organization
TITLE:jobTitle
EMAIL:email
TEL:phone
URL:website
ADR:;;address;;;;
END:VCARD
```

Omit empty optional fields except `BEGIN:VCARD`, `VERSION:3.0`, `N`, `FN`, and
`END:VCARD`.

## V2 ideas

- Add quick styles when the CLI supports style presets.
- Add bit style, eye style, pupil style, and padding when the CLI exposes those options.
- Add SVG export when supported by the CLI.
- Add batch QR ZIP generation as a separate command or mode after CLI behavior is verified.
