const numbered = (category, count, make) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${category}-${String(index + 1).padStart(2, "0")}`,
    category,
    latex: make(index + 1),
  }));

export const corpus = [
  ...numbered("fraction", 15, (n) => `\\frac{x^{${n}}}{a_{${n}}+b_{${n}}}`),
  ...numbered("radical", 15, (n) => `\\sqrt[${(n % 4) + 2}]{x^{${n}}+${n}}`),
  ...numbered("integral", 15, (n) => `\\int_{0}^{${n}} x^{${(n % 5) + 1}}\\,dx`),
  ...numbered("summation", 15, (n) => `\\sum_{k=1}^{${n + 2}} k^{${(n % 3) + 1}}`),
  ...numbered("greek", 15, (n) => `\\alpha_{${n}}+\\beta_{${n}}=\\gamma_{${n}}`),
  ...numbered("accent", 15, (n) => `\\hat{x}_{${n}}+\\bar{y}_{${n}}=\\vec{z}_{${n}}`),
  ...numbered(
    "matrix",
    15,
    (n) => `\\begin{pmatrix}${n}&${n + 1}\\\\${n + 2}&${n + 3}\\end{pmatrix}`,
  ),
  ...numbered(
    "cases",
    15,
    (n) => `f_{${n}}(x)=\\begin{cases}x^{2},&x\\geq ${n}\\\\-x,&x<${n}\\end{cases}`,
  ),
  ...numbered(
    "multiline",
    15,
    (n) =>
      `\\begin{aligned}x_{${n + 1}}&=x_{${n}}+${n}\\\\y_{${n + 1}}&=2y_{${n}}-${n}\\end{aligned}`,
  ),
  ...numbered(
    "long",
    15,
    (n) =>
      `\\frac{d}{dx}\\left(x^{${n}}e^{-${n}x}\\right)=e^{-${n}x}\\left(${n}x^{${n - 1}}-${n}x^{${n}}\\right)`,
  ),
];

if (corpus.length !== 150) throw new Error(`Expected 150 formulas, received ${corpus.length}`);
