import type { ToolResult } from "../types";
import { documentGenerators, generateRg, ufOptions } from "./documents";
import { jsonResult, randomDigits, randomInt, randomItem } from "./shared";

const firstNames = [
  "Ana",
  "Beatriz",
  "Bruno",
  "Caio",
  "Camila",
  "Carolina",
  "Daniel",
  "Eduardo",
  "Fernanda",
  "Gabriel",
  "Helena",
  "Isabela",
  "João",
  "Juliana",
  "Larissa",
  "Lucas",
  "Mariana",
  "Mateus",
  "Rafael",
  "Sofia",
] as const;

const lastNames = [
  "Almeida",
  "Barbosa",
  "Batista",
  "Cardoso",
  "Carvalho",
  "Costa",
  "Ferreira",
  "Gomes",
  "Lima",
  "Martins",
  "Mendes",
  "Oliveira",
  "Pereira",
  "Rocha",
  "Rodrigues",
  "Santos",
  "Silva",
  "Souza",
] as const;

const streets = ["Rua das Acácias", "Avenida Brasil", "Rua da Liberdade", "Alameda Santos", "Rua Projetada"];
const cities = [
  { city: "São Paulo", uf: "SP" },
  { city: "Rio de Janeiro", uf: "RJ" },
  { city: "Belo Horizonte", uf: "MG" },
  { city: "São Luís", uf: "MA" },
  { city: "Curitiba", uf: "PR" },
  { city: "Recife", uf: "PE" },
  { city: "Brasília", uf: "DF" },
] as const;

const jobTitles = [
  "Desenvolvedor(a) de Software",
  "Analista de Sistemas",
  "Product Designer",
  "Product Manager",
  "Analista de Qualidade",
  "Engenheiro(a) de Dados",
] as const;

export function generateName(gender: string, amount: number): string {
  const female = [
    "Ana",
    "Beatriz",
    "Camila",
    "Carolina",
    "Fernanda",
    "Helena",
    "Isabela",
    "Juliana",
    "Larissa",
    "Mariana",
    "Sofia",
  ];
  const male = ["Bruno", "Caio", "Daniel", "Eduardo", "Gabriel", "João", "Lucas", "Mateus", "Rafael"];
  const source = gender === "female" ? female : gender === "male" ? male : firstNames;
  return Array.from(
    { length: amount },
    () => `${randomItem(source)} ${randomItem(lastNames)} ${randomItem(lastNames)}`,
  ).join("\n");
}

export function generateNickname(amount: number): string {
  const adjectives = ["dev", "byte", "pixel", "code", "cloud", "debug", "logic", "stack", "void", "ninja"];
  const nouns = ["fox", "wolf", "hawk", "tiger", "wizard", "runner", "maker", "pilot", "labs", "forge"];
  return Array.from(
    { length: amount },
    () => `${randomItem(adjectives)}_${randomItem(nouns)}${randomInt(1, 9999)}`,
  ).join("\n");
}

export function generatePerson(): ToolResult {
  const location = randomItem(cities);
  const name = generateName("any", 1);
  const username = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, ".");
  const birthYear = randomInt(1960, 2005);
  const person = {
    nome: name,
    cpf: documentGenerators.cpf(true),
    rg: generateRg(location.uf),
    dataNascimento: `${birthYear}-${String(randomInt(1, 12)).padStart(2, "0")}-${String(randomInt(1, 28)).padStart(2, "0")}`,
    email: `${username}@example.test`,
    telefone: `(${randomInt(11, 99)}) 9${randomDigits(4)}-${randomDigits(4)}`,
    endereco: {
      logradouro: randomItem(streets),
      numero: randomInt(1, 2500),
      complemento: randomItem(["", "Apto 101", "Casa B", "Sala 12"]),
      bairro: randomItem(["Centro", "Jardins", "Boa Vista", "Vila Nova"]),
      cidade: location.city,
      uf: location.uf,
      cep: documentGenerators.cep(true),
    },
  };
  return { title: "Pessoa mock", value: jsonResult(person), metadata: [{ label: "Nome", value: name }] };
}

export function generateCompany(): ToolResult {
  const location = randomItem(cities);
  const root = randomItem(["Aurora", "Horizonte", "Nexus", "Orbe", "Pioneira", "Vértice"]);
  const area = randomItem(["Tecnologia", "Serviços", "Comércio", "Soluções Digitais", "Educação"]);
  const company = {
    razaoSocial: `${root} ${area} Ltda.`,
    nomeFantasia: `${root} ${area}`,
    cnpj: documentGenerators.cnpj(true),
    inscricaoEstadual: documentGenerators.stateRegistration(location.uf, true),
    email: `contato@${root.toLowerCase()}.example.test`,
    telefone: `(${randomInt(11, 99)}) ${randomInt(3000, 5999)}-${randomDigits(4)}`,
    endereco: {
      logradouro: randomItem(streets),
      numero: randomInt(1, 2500),
      cidade: location.city,
      uf: location.uf,
      cep: documentGenerators.cep(true),
    },
  };
  return {
    title: "Empresa mock",
    value: jsonResult(company),
    metadata: [{ label: "Empresa", value: company.razaoSocial }],
  };
}

export function generateResume(values: Record<string, string>): ToolResult {
  const name = values.name || generateName("any", 1);
  const title = values.title || randomItem(jobTitles);
  const email = values.email || "candidato@example.test";
  const city = values.city || "São Luís - MA";
  const skills = values.skills || "TypeScript, Node.js, PHP, Laravel, PostgreSQL, Docker";
  const markdown = `# ${name}

**${title}**  
${email} · ${city}

## Resumo profissional

Profissional orientado a resultados, com experiência na criação e manutenção de aplicações web, integração de APIs e melhoria contínua de produtos digitais.

## Competências

${skills
  .split(",")
  .map((skill) => `- ${skill.trim()}`)
  .join("\n")}

## Experiência

### ${title} — Empresa Exemplo

*Janeiro de 2023 – Atual*

- Desenvolvimento de funcionalidades e integrações.
- Investigação e correção de problemas em produção.
- Colaboração com produto, design e qualidade.

## Formação

**Tecnologia da Informação** — Instituição Exemplo  
Conclusão: 2022
`;
  return { title: "Currículo em Markdown", value: markdown };
}

export function generateLorem(paragraphs: number): string {
  const sentences = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Integer posuere erat a ante venenatis dapibus posuere velit aliquet.",
    "Donec ullamcorper nulla non metus auctor fringilla.",
    "Praesent commodo cursus magna, vel scelerisque nisl consectetur et.",
    "Aenean lacinia bibendum nulla sed consectetur.",
    "Maecenas faucibus mollis interdum.",
  ];
  return Array.from({ length: paragraphs }, () =>
    Array.from({ length: randomInt(3, 6) }, () => randomItem(sentences)).join(" "),
  ).join("\n\n");
}

export function generateRandomNumbers(min: number, max: number, amount: number, unique: boolean): string {
  if (unique && max - min + 1 < amount) throw new Error("O intervalo não contém números únicos suficientes.");
  if (unique) {
    const numbers = new Set<number>();
    while (numbers.size < amount) numbers.add(randomInt(min, max));
    return [...numbers].join("\n");
  }
  return Array.from({ length: amount }, () => randomInt(min, max)).join("\n");
}

export function generatePassword(
  length: number,
  options: { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean },
): string {
  const sets = [
    options.upper ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "",
    options.lower ? "abcdefghijklmnopqrstuvwxyz" : "",
    options.numbers ? "0123456789" : "",
    options.symbols ? "!@#$%&*()-+.,;?[]{}^><:" : "",
  ].filter(Boolean);
  if (sets.length === 0) throw new Error("Selecione pelo menos um conjunto de caracteres.");
  const required = sets.map((set) => randomItem(set.split("")));
  const all = sets.join("");
  const remaining = Array.from({ length: Math.max(0, length - required.length) }, () =>
    randomItem(all.split("")),
  );
  return [...required, ...remaining]
    .sort(() => Math.random() - 0.5)
    .join("")
    .slice(0, length);
}

export const availableUfs = ufOptions;
