# Amino Acid Lookup for Raycast

Look up amino acids by one-letter code, three-letter code or full name — as you type, calculator-style.

| You type | You get |
| --- | --- |
| `Trp` | **W** · Tryptophan |
| `w` | **Trp** · Tryptophan |
| `glut` | Glutamine (Q, Gln), Glutamic acid (E, Glu), Glx (Z) |
| `MKTAYIAK` | Met-Lys-Thr-Ala-Tyr-Ile-Ala-Lys |
| `Met-Lys-Thr` / `MetLysThr` / `met lys thr` | MKT |

Each residue also shows side-chain class, molecular weight and DNA codons. Sequences show length and average mass.
Covers the 20 standard amino acids, selenocysteine (U/Sec), pyrrolysine (O/Pyl), ambiguity codes (B, Z, J, X) and stop (\*/Ter).

## Colors

Amino acids are colored with the **Clustal X** scheme by default. Switch to **Taylor** in Raycast Settings → Extensions → Amino Acid Lookup, or with **Change Color Scheme…** in the ⌘K menu.

## Keyboard

| Key | Action |
| --- | --- |
| ↵ | Copy the notation you didn't type (e.g. type `Trp` → copies `W`) |
| ⌘↵ | Paste it into the frontmost app |
| ⌘1 / ⌘3 / ⌘⌥C | Copy one-letter / three-letter / name |
| ⌃C | Copy codons |

## Getting it closer to the built-in calculator

Raycast doesn't let extensions put results inline in the root search, but you can get close:

1. **Alias or hotkey** — Raycast Settings → Extensions → Amino Acid Lookup → Look Up Amino Acids → set an alias like `aa`. Then type `aa`, Tab, `Trp`.
2. **Fallback command** — In root search, type `Trp`, scroll to the bottom, ⌘K on "Look Up Amino Acids" → *Add to Fallback Commands*. Anything Raycast doesn't recognize can then be sent straight into the extension with the text pre-filled.

## Development

```bash
npm install
npm run dev     # opens it in Raycast with hot reload
npm run lint
npm test        # checks the lookup logic
```
