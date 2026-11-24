export interface Template {
  name: string;
  keywords: string;
  latex: string;
}

export const TEMPLATES: Template[] = [
  { name: "Fraction", keywords: "frac divide over", latex: String.raw`\frac{a}{b}` },
  { name: "Square Root", keywords: "sqrt root radical", latex: String.raw`\sqrt{x}` },
  { name: "Sum", keywords: "sigma series summation", latex: String.raw`\sum_{i=1}^{n} x_i` },
  { name: "Product", keywords: "pi prod", latex: String.raw`\prod_{i=1}^{n} x_i` },
  { name: "Integral", keywords: "int integrate", latex: String.raw`\int_{a}^{b} f(x)\,dx` },
  { name: "Double Integral", keywords: "iint area", latex: String.raw`\iint_{D} f(x,y)\,dA` },
  { name: "Limit", keywords: "lim tends", latex: String.raw`\lim_{x \to \infty} f(x)` },
  { name: "Derivative", keywords: "ddx differentiate", latex: String.raw`\frac{d}{dx} f(x)` },
  { name: "Partial Derivative", keywords: "partial pde", latex: String.raw`\frac{\partial f}{\partial x}` },
  { name: "Matrix", keywords: "pmatrix array grid", latex: String.raw`\begin{pmatrix} a & b \\ c & d \end{pmatrix}` },
  {
    name: "Determinant",
    keywords: "vmatrix det",
    latex: String.raw`\det(A) = \begin{vmatrix} a & b \\ c & d \end{vmatrix}`,
  },
  {
    name: "Column Vector",
    keywords: "vector bmatrix",
    latex: String.raw`\mathbf{v} = \begin{bmatrix} v_1 \\ v_2 \\ v_3 \end{bmatrix}`,
  },
  { name: "Vector Arrow", keywords: "vec arrow", latex: String.raw`\vec{F} = m\vec{a}` },
  {
    name: "Cases (Piecewise)",
    keywords: "piecewise cases if",
    latex: String.raw`f(x) = \begin{cases} x^2 & x \ge 0 \\ -x & x < 0 \end{cases}`,
  },
  {
    name: "Aligned Equations",
    keywords: "align multiline steps",
    latex: String.raw`\begin{aligned} (a+b)^2 &= (a+b)(a+b) \\ &= a^2 + 2ab + b^2 \end{aligned}`,
  },
  { name: "Binomial", keywords: "choose binom", latex: String.raw`\binom{n}{k} = \frac{n!}{k!\,(n-k)!}` },
  { name: "Quadratic Formula", keywords: "quadratic roots", latex: String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}` },
  { name: "Euler's Identity", keywords: "euler e i pi", latex: String.raw`e^{i\pi} + 1 = 0` },
  {
    name: "Gaussian",
    keywords: "normal distribution bell",
    latex: String.raw`f(x) = \frac{1}{\sigma\sqrt{2\pi}}\, e^{-\frac{(x-\mu)^2}{2\sigma^2}}`,
  },
  {
    name: "Taylor Series",
    keywords: "taylor expansion",
    latex: String.raw`f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n`,
  },
  { name: "Set Notation", keywords: "set builder in", latex: String.raw`S = \{\, x \in \mathbb{R} \mid x > 0 \,\}` },
  {
    name: "Greek Letters",
    keywords: "alpha beta gamma symbols",
    latex: String.raw`\alpha\ \beta\ \gamma\ \delta\ \epsilon\ \theta\ \lambda\ \mu\ \pi\ \sigma\ \phi\ \omega`,
  },
  { name: "Text in Math", keywords: "text words", latex: String.raw`v = \frac{d}{t} \quad \text{(speed)}` },
  { name: "Colored Term", keywords: "color highlight", latex: String.raw`a + \color{red}{b} + c` },
  { name: "Boxed", keywords: "box answer", latex: String.raw`\boxed{E = mc^2}` },
];
