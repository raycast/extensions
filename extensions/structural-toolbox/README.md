# Structural Toolbox

Quick structural engineering calculations that show the mechanics, not just a number: sketch, equation, substituted values, result. Everything is calculated locally; no AI or remote engineering API is used.

## Commands

- **Structures**: beams, frames and trusses (linear 2D FE), stress, section properties, Euler buckling, lateral-torsional buckling factors, St. Venant and warping torsion, and 92 reference load cases.
- **Library**: browse and edit 48 materials and 713 sections (IPE, HEA/HEB/HEM, UPN, angles, SHS/RHS/CHS, timber, glulam and more) through CSV files.
- **Guide**: examples, units, assumptions and how to edit the library.

## Try it

Open **Structures** and type:

```text
simply, 6m, 3kN/m, C24, 100x300
cantilever, 4m, 10kN, at 40%, S355, IPE200
continuous 5, 4m each, 10kN, span 2, at 40%, C24, 100x300
```

Use **Enlarge Diagram** to see the values, section, loads, reactions and the shear, moment and deflection curves on one screen.

## Limits

This is a general elastic calculator and reference library. Code resistance checks, cracking, creep, geometric nonlinearity, dynamics and 3D analysis are not included. Always confirm results against the applicable standard before using them for design.
