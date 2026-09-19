export function gcd(a: number, b: number): number {
  let left = Math.abs(Math.trunc(a));
  let right = Math.abs(Math.trunc(b));
  while (right !== 0) [left, right] = [right, left % right];
  return left;
}

export function lcm(numbers: number[]): number {
  return numbers.reduce((result, value) => Math.abs(result * value) / gcd(result, value), 1);
}

export function factorize(input: number): string {
  let value = Math.abs(Math.trunc(input));
  if (value < 2) return `${input} não possui fatores primos.`;
  const original = value;
  const factors: number[] = [];
  for (let divisor = 2; divisor * divisor <= value; divisor += divisor === 2 ? 1 : 2) {
    while (value % divisor === 0) {
      factors.push(divisor);
      value /= divisor;
    }
  }
  if (value > 1) factors.push(value);
  const grouped = [...new Set(factors)].map((factor) => {
    const exponent = factors.filter((item) => item === factor).length;
    return exponent > 1 ? `${factor}^${exponent}` : String(factor);
  });
  return `${original} = ${grouped.join(" × ")}`;
}

const romanValues: Array<[number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(input: number): string {
  let value = Math.trunc(input);
  if (value < 1 || value > 3999) throw new Error("A conversão romana clássica aceita valores de 1 a 3999.");
  let result = "";
  for (const [number, roman] of romanValues) {
    while (value >= number) {
      result += roman;
      value -= number;
    }
  }
  return result;
}

export function fromRoman(input: string): number {
  const roman = input.trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(roman)) throw new Error("Número romano inválido.");
  let index = 0;
  let value = 0;
  for (const [number, symbol] of romanValues) {
    while (roman.slice(index, index + symbol.length) === symbol) {
      value += number;
      index += symbol.length;
    }
  }
  if (index !== roman.length || toRoman(value) !== roman)
    throw new Error("Número romano fora da forma canônica.");
  return value;
}

export function percentage(base: number, percent: number, operation: string): string {
  const fraction = percent / 100;
  if (operation === "of") return String(base * fraction);
  if (operation === "increase") return String(base * (1 + fraction));
  if (operation === "decrease") return String(base * (1 - fraction));
  throw new Error("Operação de porcentagem inválida.");
}

export function simpleRuleOfThree(a: number, b: number, c: number): number {
  if (a === 0) throw new Error("O primeiro valor não pode ser zero.");
  return (b * c) / a;
}

export type AreaShape =
  | "circle"
  | "square"
  | "rectangle"
  | "triangle"
  | "pentagon"
  | "hexagon"
  | "regular-polygon"
  | "rhombus"
  | "trapezoid"
  | "parallelogram"
  | "ellipse"
  | "annulus"
  | "sector";

export function calculateArea(shape: AreaShape, values: Record<string, number>): number {
  const positive = (...names: string[]) => {
    for (const name of names)
      if (!Number.isFinite(values[name]) || values[name] <= 0)
        throw new Error("Informe dimensões maiores que zero.");
  };
  switch (shape) {
    case "circle":
      positive("radius");
      return Math.PI * values.radius ** 2;
    case "square":
      positive("side");
      return values.side ** 2;
    case "rectangle":
    case "parallelogram":
      positive("base", "height");
      return values.base * values.height;
    case "triangle":
      positive("base", "height");
      return (values.base * values.height) / 2;
    case "pentagon":
    case "hexagon":
    case "regular-polygon": {
      const sides = shape === "pentagon" ? 5 : shape === "hexagon" ? 6 : Math.trunc(values.sides);
      positive("side");
      if (sides < 3) throw new Error("O polígono precisa ter ao menos 3 lados.");
      return (sides * values.side ** 2) / (4 * Math.tan(Math.PI / sides));
    }
    case "rhombus":
      positive("majorDiagonal", "minorDiagonal");
      return (values.majorDiagonal * values.minorDiagonal) / 2;
    case "trapezoid":
      positive("majorBase", "minorBase", "height");
      return ((values.majorBase + values.minorBase) * values.height) / 2;
    case "ellipse":
      positive("majorRadius", "minorRadius");
      return Math.PI * values.majorRadius * values.minorRadius;
    case "annulus":
      positive("outerRadius", "innerRadius");
      if (values.innerRadius >= values.outerRadius)
        throw new Error("O raio interno deve ser menor que o externo.");
      return Math.PI * (values.outerRadius ** 2 - values.innerRadius ** 2);
    case "sector":
      positive("radius", "angle");
      if (values.angle > 360) throw new Error("O ângulo deve ser menor ou igual a 360°.");
      return (values.angle / 360) * Math.PI * values.radius ** 2;
  }
}
