# Equation Solver

Solve linear and quadratic equations right inside Raycast. Type an equation in the search bar and get the answer instantly — with the algebra steps shown beside it, so you can check the working, not just the result.

![Equation Solver in action](media/equation-solver-1.png)

## Features

- **One unknown, any name** — a single letter (`x`, `y`, `z`) or a multi-letter name (`Va`, `Vout`, `x1`), matched case-insensitively. Handy for circuit work like node voltages.
- **Linear and quadratic** equations, solved symbolically (not numerically guessed), with step-by-step working.
- **Unknown in a denominator** — fractions like `1/5=3/x` are cleared properly, roots that would make a denominator zero are rejected as extraneous, and identities report their excluded values.
- **Implicit multiplication** — write `2x`, `3(x+2)` or `(x+1)(x-1)` without `*` signs.
- **Exact answers first** — tidy fractions are preferred, e.g. `x = 13/4 = 3.25`.
- **Honest edge cases** — no-solution, infinitely-many-solutions and complex-root cases are reported as such, never silently forced.
- Copy the answer, or the equation with its answer, from the Action Panel.

## How to Use

1. Open the **Equation Solver** command in Raycast.
2. Type your equation into the search bar, e.g. `x+15=20`.
3. The answer updates as you type; the detail pane shows the standard form and the steps.
4. Press `⏎` actions to copy the result.

No configuration or accounts required.

## Examples

| Equation | Answer |
| --- | --- |
| `x+15=20` | x = 5 |
| `2x-4=10` | x = 7 |
| `30=x/15` | x = 450 |
| `1/5=3/x` | x = 15 |
| `(20-Va)/10+(15-Va)/5=Va/5` | Va = 10 |
| `3(x+2)=21` | x = 5 |
| `y^2-5y+6=0` | y = 3 or y = 2 |
| `x^2+1=0` | No real solution (complex roots are shown) |
| `2x/(x-3)=6/(x-3)` | No solution (x = 3 would divide by zero) |

## Supported

- Operators `+`, `-`, `*`, `/`, `^` and parentheses; `²` and `³` also work
- Decimals and fractions
- One unknown per equation

## Limitations

- Systems of equations (more than one unknown, e.g. `x+y=10`) are not supported
- Equations that reduce to degree 3 or higher (after clearing denominators) are not supported
- Roots, trigonometric and logarithmic functions are not supported
