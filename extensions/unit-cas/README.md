# Unit CAS

A Raycast calculator that uses the **TI-Nspire unit system** and **solve functions**, and reads and writes both
**LaTeX** and **TI-Nspire** text, so you can move a calculation between a LaTeX document and an Nspire without retyping it.

## Commands

- **Calculate**: type or paste into the search bar. The detail pane shows the typeset result (rendered locally with MathJax)
  and the LaTeX / Nspire text of the input and result.
  - The search-bar dropdown (or `⇧⌘A`) switches Radian / Degree / Gradian.
  - `↵` copies the result in your primary format (preference), `⌘↵` the other format.
  - `⇧⌘L` / `⇧⌘N` copy the *input* translated to LaTeX / Nspire. `⇧⌘E` copies `input = result` as LaTeX.
  - On a history item, `↵` loads the whole calculation back into the search bar and `⌘↵` copies the result.
  - Results with units list conversions for the same dimension (like the Nspire's ► menu).
  - `a:=5_m`, `5_m→a` or `f(x):=x^2-3` show a **Store** action. Stored definitions persist and appear when the input is empty.
- **Browse Units**: every unit and constant with its Nspire name, LaTeX form and SI factor.

## Input

Both syntaxes are detected automatically (LaTeX is recognized by `\commands`, `^{…}`, `_{…}`).

| | TI-Nspire text | LaTeX |
|---|---|---|
| Units | `5_km/(2_hr)`, `5.*_m`, `_°C`, `_Ω`, `_μF` | `5\,\mathrm{km/h}`, `\text{kg\,m^{2}}`, `25^{\circ}\mathrm{C}`, `\SI{5}{\kilo\meter\per\hour}`, `\qty{9.81}{m/s^2}` |
| Conversion | `3_km►_mi`, `3_km@>_mi`, `▶` | `3\,\mathrm{km}\blacktriangleright\mathrm{mi}` |
| Solve | `solve(x^2-4=0,x)`, `nSolve(cos(x)=x,x)`, `zeros(x^2-2,x)` | `\operatorname{solve}\left(x^{2}=4,x\right)` or just `x^{2}=4` |
| Conditions | `solve(F=m*a,a)\|F=10_N and m=2_kg`, `\|x>0` | `\mid`, `\text{ and }`, `\land` |
| Systems | `solve(x+y=3 and x-y=1,{x,y})` | `\begin{cases}x+y=3\\x-y=1\end{cases}` |
| Other | `√(`, `sin⁻¹(`, `ℯ`, `π`, `x²`, `10⁻³`, `ᴇ` | `\frac`, `\sqrt[n]{}`, `\log_{b}`, `\left|x\right|`, `\binom`, `1{,}5`, `3\cdot 10^{8}` |

An equation containing unknowns is solved automatically (`x^2-5x+6=0` → `x=2 or x=3`).
In LaTeX, adjacent letters multiply (`xy`); in Nspire text they form one name, as on the calculator.

## Units (Nspire semantics)

- Results are shown in SI base units or the matching derived unit (`_N`, `_J`, `_W`, `_Pa`, `_V`, `_Ω`, …), e.g.
  `5_N*2_m` → `10*_J`, `_Na*_k` → `8.31446*_J/(_K*_mol)`. Use `►` to pick a unit.
- A plain temperature is absolute: `20_°C` → `293.15*_K`, `100_°C►_°F` → `212*_°F` (unlike the Nspire, where `►`
  converts differences). Inside larger expressions temperatures are differences (`20_°C+5_°C` → `25*_K`);
  `tmpCnv(100_°C,_°F)` always converts absolute temperatures and `ΔtmpCnv(100_°C,_°F)` differences (`180*_°F`).
- Nspire constants: `_c _g _Gc _h _k _Na _q _Me _Mp _Mn _Rc _Rb _Rdb _Vm _ε0 _μ0 _σ _φ0 _μb _Cc` (CODATA 2018 values).
- Any SI prefix works on SI units (`_kN`, `_GHz`, `_mbar`); `_gm` is gram, since `_g` is gravity on the Nspire.
- `solve` infers the units of the unknown: `solve(x*2_s=10_m,x)` → `x=5*_m/_s`.

## Solve

- Polynomials and rational equations are solved exactly: rational roots, `√` forms from quadratics and biquadratics
  (`x=(-1+√(5))/2`); other roots are decimals. Simple decimal results are recognized as `π/6`, `√(2)/2`, `ln(2)`, `root(2,3)`.
- Periodic equations return the general solution with `n1`: `solve(sin(x)=1/2,x)` → `x=π/6+2*π*n1 or x=5*π/6+2*π*n1`.
  Add bounds to list values instead: `solve(sin(x)=1/2,x)|0<x<π`.
- Inequalities (single variable): `solve(x^2>4,x)` → `x<-2 or x>2`.
- Linear systems are solved exactly (underdetermined ones use `c1, c2…`); nonlinear systems numerically.
- `nSolve(eq,x)`, `nSolve(eq,x=guess)`, `nSolve(eq,x,lower,upper)` return one decimal solution.
- With other unknown letters the equation is solved symbolically, variable on the left:
  `solve(f=m/a,m)` → `m=a*f`, `solve(a*x^2+b*x+c=0,x)` → the quadratic formula,
  `solve(x+y=a and x-y=b,{x,y})` → `x=(a+b)/2 and y=(a-b)/2`.
- Systems: `solve(system(x=y*2,y=x+2),x,y)`, `solve(x+y=3 and x-y=1,{x,y})` or LaTeX `\begin{cases}…\end{cases}`.

## Other functions

- Algebra: expressions with unknowns simplify (`a+a` → `2*a`, `(a^2-b^2)/(a-b)` → `a+b`), `expand()`, `factor()` (integers),
  `|x=a+1` substitution.
- Calculus: `d(expr,x[,n])` (symbolic; `\frac{d}{dx}`), `nDeriv(expr,x=a)`, `nInt(expr,x,a,b)` / `∫(…)` / `\int_a^b … dx`,
  `fMin` / `fMax`, `sum`/`Σ(expr,k,a,b)` (`\sum_{k=a}^{b}`), `product`, `seq`.
- Vectors: `dotP`, `crossP`, `norm`, `unitV` on `[1,2,3]`, `{1,2,3}` or LaTeX `pmatrix`.
- Lists and statistics: `mean`, `median`, `stDevSamp`, `stDevPop`, `varSamp`, `varPop`, `cumSum`, `dim`, `SortA`, `SortD`,
  `augment`, `min`, `max`; integers: `gcd`, `lcm`, `mod`, `intDiv`, `isPrime`, `nCr`, `nPr`, `getNum`, `getDenom`; `when`.

## Number display

Like the Nspire's Float mode, numbers longer than the display digits switch to scientific notation:
`2^100` → `1.26765ᴇ30`, `_c` → `2.99792ᴇ8*_m/_s`. Exact mode keeps every digit.

## Modes (preferences)

The angle mode can also be switched while calculating, from the dropdown in the search bar or with `⇧⌘A`
(Radian → Degree → Gradian). The choice is remembered; results that use trig functions show the active mode.
Angle units always win over the mode: `sin(30_°)` is ½ in any mode.

Calculation mode (Auto / Exact / Approximate), default angle mode (Radian / Degree / Gradian), Float 4–12 display digits,
primary copy format, ASCII Nspire export (`@>`, `sqrt(`, `<=`, `pi`) and math preview.

## Not yet supported

Complex numbers (`cSolve` returns real solutions only), symbolic solving of equations that are neither
polynomial (degree ≤ 2 in the unknown) nor solvable by isolating a single occurrence, nonlinear symbolic systems,
indefinite integrals, matrices beyond vectors, and custom unit definitions.
