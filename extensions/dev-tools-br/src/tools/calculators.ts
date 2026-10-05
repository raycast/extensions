import { Icon } from "@raycast/api";
import type { FieldDefinition, ToolDefinition, ToolValues } from "../types";
import { addDays, daysBetween } from "../lib/date-tools";
import {
  calculateArea,
  factorize,
  fromRoman,
  gcd,
  lcm,
  percentage,
  simpleRuleOfThree,
  toRoman,
  type AreaShape,
} from "../lib/math-tools";
import { formatDateBr, parseDate } from "../lib/shared";
import { areaField, booleanValue, rawNumber, simpleResult, stringValue, textField } from "./helpers";

export const mathTools: ToolDefinition[] = [
  {
    id: "roman-converter",
    title: "Conversor de Números Romanos",
    description: "Converte entre inteiros e números romanos canônicos.",
    category: "Matemática",
    icon: Icon.Hashtag,
    fields: [
      {
        type: "dropdown",
        name: "operation",
        title: "Conversão",
        defaultValue: "toRoman",
        options: [
          { title: "Decimal para romano", value: "toRoman" },
          { title: "Romano para decimal", value: "fromRoman" },
        ],
      },
      textField("value", "Número", "2026"),
    ],
    run(values) {
      const operation = stringValue(values, "operation", "toRoman");
      return simpleResult(
        "Conversão romana",
        operation === "toRoman"
          ? toRoman(rawNumber(values, "value"))
          : String(fromRoman(stringValue(values, "value"))),
      );
    },
  },
  {
    id: "factor-number",
    title: "Fatorar Número",
    description: "Decompõe um inteiro em fatores primos.",
    category: "Matemática",
    icon: Icon.Calculator,
    fields: [textField("value", "Número inteiro", "360")],
    run: (values) => simpleResult("Fatoração", factorize(rawNumber(values, "value"))),
  },
  {
    id: "gcd",
    title: "MDC",
    description: "Calcula o máximo divisor comum.",
    category: "Matemática",
    icon: Icon.Calculator,
    fields: [textField("numbers", "Números", "24, 36, 60")],
    run(values) {
      const numbers = parseNumberList(stringValue(values, "numbers"));
      return simpleResult("MDC", String(numbers.reduce(gcd)));
    },
  },
  {
    id: "lcm",
    title: "MMC",
    description: "Calcula o mínimo múltiplo comum.",
    category: "Matemática",
    icon: Icon.Calculator,
    fields: [textField("numbers", "Números", "4, 6, 10")],
    run: (values) => simpleResult("MMC", String(lcm(parseNumberList(stringValue(values, "numbers"))))),
  },
  {
    id: "percentage",
    title: "Porcentagem",
    description: "Calcula percentual, aumento ou desconto.",
    category: "Matemática",
    icon: Icon.Calculator,
    fields: [
      {
        type: "dropdown",
        name: "operation",
        title: "Operação",
        defaultValue: "of",
        options: [
          { title: "X% de um valor", value: "of" },
          { title: "Aumentar X%", value: "increase" },
          { title: "Diminuir X%", value: "decrease" },
        ],
      },
      textField("base", "Valor", "100"),
      textField("percent", "Percentual", "10"),
    ],
    run: (values) =>
      simpleResult(
        "Resultado da porcentagem",
        percentage(rawNumber(values, "base"), rawNumber(values, "percent"), stringValue(values, "operation")),
      ),
  },
  {
    id: "rule-of-three",
    title: "Regra de 3 Simples",
    description: "Resolve a/b = c/x.",
    category: "Matemática",
    icon: Icon.Calculator,
    fields: [areaField("a", "A"), areaField("b", "B"), areaField("c", "C")],
    run: (values) =>
      simpleResult(
        "X",
        String(simpleRuleOfThree(rawNumber(values, "a"), rawNumber(values, "b"), rawNumber(values, "c"))),
      ),
  },
  {
    id: "division-remainder",
    title: "Resto da Divisão",
    description: "Calcula quociente inteiro e resto.",
    category: "Matemática",
    icon: Icon.Calculator,
    fields: [textField("dividend", "Dividendo", "17"), textField("divisor", "Divisor", "5")],
    run(values) {
      const dividend = rawNumber(values, "dividend");
      const divisor = rawNumber(values, "divisor");
      if (divisor === 0) throw new Error("O divisor não pode ser zero.");
      const quotient = Math.trunc(dividend / divisor);
      const remainder = dividend % divisor;
      return {
        title: "Divisão",
        value: String(remainder),
        metadata: [
          { label: "Quociente", value: String(quotient) },
          { label: "Resto", value: String(remainder) },
        ],
      };
    },
  },
];

function parseNumberList(value: string): number[] {
  const numbers = value
    .split(/[;,\s]+/)
    .filter(Boolean)
    .map(Number);
  if (numbers.length < 2 || numbers.some((number) => !Number.isFinite(number)))
    throw new Error("Informe ao menos dois números separados por vírgula.");
  return numbers;
}

type AreaConfig = { id: string; title: string; shape: AreaShape; fields: FieldDefinition[]; formula: string };

const areaConfigs: AreaConfig[] = [
  {
    id: "circle",
    title: "Área do Círculo",
    shape: "circle",
    fields: [areaField("radius", "Raio")],
    formula: "π × raio²",
  },
  {
    id: "square",
    title: "Área do Quadrado",
    shape: "square",
    fields: [areaField("side", "Lado")],
    formula: "lado²",
  },
  {
    id: "rectangle",
    title: "Área do Retângulo",
    shape: "rectangle",
    fields: [areaField("base", "Base"), areaField("height", "Altura")],
    formula: "base × altura",
  },
  {
    id: "triangle",
    title: "Área do Triângulo",
    shape: "triangle",
    fields: [areaField("base", "Base"), areaField("height", "Altura")],
    formula: "base × altura ÷ 2",
  },
  {
    id: "pentagon",
    title: "Área do Pentágono",
    shape: "pentagon",
    fields: [areaField("side", "Lado")],
    formula: "5 × lado² ÷ (4 × tan(π/5))",
  },
  {
    id: "hexagon",
    title: "Área do Hexágono",
    shape: "hexagon",
    fields: [areaField("side", "Lado")],
    formula: "6 × lado² ÷ (4 × tan(π/6))",
  },
  {
    id: "regular-polygon",
    title: "Área do Polígono Regular",
    shape: "regular-polygon",
    fields: [areaField("sides", "Número de lados"), areaField("side", "Comprimento do lado")],
    formula: "n × lado² ÷ (4 × tan(π/n))",
  },
  {
    id: "rhombus",
    title: "Área do Losango",
    shape: "rhombus",
    fields: [areaField("majorDiagonal", "Diagonal maior"), areaField("minorDiagonal", "Diagonal menor")],
    formula: "D × d ÷ 2",
  },
  {
    id: "trapezoid",
    title: "Área do Trapézio",
    shape: "trapezoid",
    fields: [
      areaField("majorBase", "Base maior"),
      areaField("minorBase", "Base menor"),
      areaField("height", "Altura"),
    ],
    formula: "(B + b) × h ÷ 2",
  },
  {
    id: "parallelogram",
    title: "Área do Paralelogramo",
    shape: "parallelogram",
    fields: [areaField("base", "Base"), areaField("height", "Altura")],
    formula: "base × altura",
  },
  {
    id: "ellipse",
    title: "Área da Elipse",
    shape: "ellipse",
    fields: [areaField("majorRadius", "Semieixo maior"), areaField("minorRadius", "Semieixo menor")],
    formula: "π × a × b",
  },
  {
    id: "annulus",
    title: "Área da Coroa Circular",
    shape: "annulus",
    fields: [areaField("outerRadius", "Raio externo"), areaField("innerRadius", "Raio interno")],
    formula: "π × (R² − r²)",
  },
  {
    id: "sector",
    title: "Área do Setor Circular",
    shape: "sector",
    fields: [areaField("radius", "Raio"), areaField("angle", "Ângulo em graus")],
    formula: "ângulo ÷ 360 × π × raio²",
  },
];

export const areaTools: ToolDefinition[] = areaConfigs.map((config) => ({
  id: `area-${config.id}`,
  title: config.title,
  description: `Calcula ${config.title.toLocaleLowerCase("pt-BR")}.`,
  category: "Áreas",
  icon: Icon.Ruler,
  fields: config.fields,
  run(values: ToolValues) {
    const dimensions: Record<string, number> = {};
    for (const field of config.fields) dimensions[field.name] = rawNumber(values, field.name);
    const area = calculateArea(config.shape, dimensions);
    return {
      title: config.title,
      value: String(area),
      metadata: [
        { label: "Fórmula", value: config.formula },
        { label: "Resultado", value: area.toLocaleString("pt-BR", { maximumFractionDigits: 10 }) },
      ],
    };
  },
}));

const dateField = (name: string, title: string): FieldDefinition => ({
  type: "date",
  name,
  title,
  required: true,
});

export const dateTools: ToolDefinition[] = [
  {
    id: "days-between-dates",
    title: "Contador de Dias entre Datas",
    description: "Calcula a diferença em dias civis entre duas datas.",
    category: "Datas e Horas",
    icon: Icon.Calendar,
    fields: [
      dateField("start", "Data inicial"),
      dateField("end", "Data final"),
      {
        type: "checkbox",
        name: "inclusive",
        title: "Contagem",
        label: "Incluir as duas datas",
        defaultValue: false,
      },
    ],
    run: (values) =>
      simpleResult(
        "Diferença em dias",
        String(
          daysBetween(parseDate(values.start), parseDate(values.end), booleanValue(values, "inclusive")),
        ),
      ),
  },
  {
    id: "add-days",
    title: "Somar Dias em Datas",
    description: "Soma dias civis a uma data.",
    category: "Datas e Horas",
    icon: Icon.Calendar,
    fields: [dateField("date", "Data"), textField("days", "Dias", "30")],
    run: (values) =>
      simpleResult(
        "Data resultante",
        formatDateBr(addDays(parseDate(values.date), rawNumber(values, "days"))),
      ),
  },
  {
    id: "subtract-days",
    title: "Subtrair Dias em Datas",
    description: "Subtrai dias civis de uma data.",
    category: "Datas e Horas",
    icon: Icon.Calendar,
    fields: [dateField("date", "Data"), textField("days", "Dias", "30")],
    run: (values) =>
      simpleResult(
        "Data resultante",
        formatDateBr(addDays(parseDate(values.date), -rawNumber(values, "days"))),
      ),
  },
];
