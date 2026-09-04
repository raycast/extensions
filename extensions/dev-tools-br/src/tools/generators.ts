import { Icon } from "@raycast/api";
import type { RgUfCode, UfCode } from "@br-validators/core";
import type { ToolDefinition } from "../types";
import {
  banks,
  documentGenerators,
  formatCertificateRegistration,
  generateBankAccount,
  generateCertificateRegistration,
  generateRg,
  generateVehicle,
  ufOptions,
} from "../lib/documents";
import {
  generateCompany,
  generateLorem,
  generateName,
  generateNickname,
  generatePassword,
  generatePerson,
  generateRandomNumbers,
  generateResume,
} from "../lib/mock-data";
import { fancyTextVariants, symbolCollections } from "../lib/text-tools";
import { randomDigits, randomInt } from "../lib/shared";
import { booleanValue, numberValue, simpleResult, stringValue, textField } from "./helpers";

const maskField = {
  type: "checkbox" as const,
  name: "masked",
  title: "Formatação",
  label: "Aplicar máscara",
  defaultValue: true,
};

const ufField = {
  type: "dropdown" as const,
  name: "uf",
  title: "UF",
  defaultValue: "SP",
  options: ufOptions.map((uf) => ({ title: uf, value: uf })),
};

export const generatorTools: ToolDefinition[] = [
  {
    id: "generate-certificate",
    title: "Gerador de Certidões",
    description: "Gera matrícula sintética de certidão civil com 32 dígitos.",
    category: "Geradores",
    icon: Icon.Document,
    keywords: ["nascimento", "casamento", "óbito", "matrícula"],
    fields: [
      {
        type: "dropdown",
        name: "type",
        title: "Tipo",
        defaultValue: "nascimento",
        options: [
          { title: "Nascimento", value: "nascimento" },
          { title: "Casamento", value: "casamento" },
          { title: "Óbito", value: "obito" },
        ],
      },
      maskField,
    ],
    run(values) {
      const number = generateCertificateRegistration();
      const type = stringValue(values, "type", "nascimento");
      return {
        title: `Certidão de ${type}`,
        value: booleanValue(values, "masked", true) ? formatCertificateRegistration(number) : number,
        subtitle: "Matrícula sintética para desenvolvimento e testes.",
      };
    },
  },
  {
    id: "generate-cnh",
    title: "Gerador de CNH",
    description: "Gera um número de CNH com dígitos verificadores válidos.",
    category: "Geradores",
    icon: Icon.Person,
    run: () => simpleResult("CNH gerada", documentGenerators.cnh()),
  },
  {
    id: "generate-bank-account",
    title: "Gerador de Conta Bancária",
    description: "Gera banco, agência e conta sintéticos para testes.",
    category: "Geradores",
    icon: Icon.BankNote,
    fields: [
      {
        type: "dropdown",
        name: "bank",
        title: "Banco",
        defaultValue: "001",
        options: Object.values(banks).map((bank) => ({
          title: `${bank.code} — ${bank.name}`,
          value: bank.code,
        })),
      },
    ],
    run: (values) => generateBankAccount(stringValue(values, "bank", "001")),
  },
  {
    id: "generate-cpf",
    title: "Gerador de CPF",
    description: "Gera CPF sintético com dígitos verificadores válidos.",
    category: "Geradores",
    icon: Icon.PersonCircle,
    fields: [maskField],
    run: (values) => simpleResult("CPF gerado", documentGenerators.cpf(booleanValue(values, "masked", true))),
  },
  {
    id: "generate-resume",
    title: "Gerador de Currículo",
    description: "Cria um currículo mock em Markdown.",
    category: "Geradores",
    icon: Icon.Document,
    fields: [
      textField("name", "Nome", "Deixe vazio para gerar", false),
      textField("title", "Cargo", "Desenvolvedor(a) de Software", false),
      textField("email", "E-mail", "candidato@example.test", false),
      textField("city", "Cidade", "São Luís - MA", false),
      textField("skills", "Competências", "TypeScript, Laravel, PostgreSQL", false),
    ],
    run: (values) =>
      generateResume({
        name: stringValue(values, "name"),
        title: stringValue(values, "title"),
        email: stringValue(values, "email"),
        city: stringValue(values, "city"),
        skills: stringValue(values, "skills"),
      }),
  },
  {
    id: "generate-fancy-letters",
    title: "Gerador de Letras Diferentes",
    description: "Gera variações Unicode prontas para copiar.",
    category: "Geradores",
    icon: Icon.Text,
    fields: [textField("text", "Texto", "Dev Tools BR")],
    run: (values) => simpleResult("Letras diferentes", fancyTextVariants(stringValue(values, "text"))),
  },
  {
    id: "generate-nicks",
    title: "Gerador de Nicks",
    description: "Gera apelidos aleatórios.",
    category: "Geradores",
    icon: Icon.Person,
    fields: [textField("amount", "Quantidade", "10", true, "10")],
    run: (values) =>
      simpleResult("Nicks gerados", generateNickname(numberValue(values, "amount", 1, 100, 10))),
  },
  {
    id: "generate-names",
    title: "Gerador de Nomes",
    description: "Gera nomes brasileiros fictícios.",
    category: "Geradores",
    icon: Icon.Person,
    fields: [
      {
        type: "dropdown",
        name: "gender",
        title: "Conjunto",
        defaultValue: "any",
        options: [
          { title: "Misto", value: "any" },
          { title: "Feminino", value: "female" },
          { title: "Masculino", value: "male" },
        ],
      },
      textField("amount", "Quantidade", "10", true, "10"),
    ],
    run: (values) =>
      simpleResult(
        "Nomes gerados",
        generateName(stringValue(values, "gender", "any"), numberValue(values, "amount", 1, 100, 10)),
      ),
  },
  {
    id: "generate-random-numbers",
    title: "Gerador de Números Aleatórios",
    description: "Gera números em um intervalo configurável.",
    category: "Geradores",
    icon: Icon.Hashtag,
    fields: [
      textField("min", "Mínimo", "1", true, "1"),
      textField("max", "Máximo", "100", true, "100"),
      textField("amount", "Quantidade", "10", true, "10"),
      {
        type: "checkbox",
        name: "unique",
        title: "Repetição",
        label: "Não repetir números",
        defaultValue: false,
      },
    ],
    run: (values) =>
      simpleResult(
        "Números aleatórios",
        generateRandomNumbers(
          numberValue(values, "min", -1_000_000_000, 1_000_000_000, 1),
          numberValue(values, "max", -1_000_000_000, 1_000_000_000, 100),
          numberValue(values, "amount", 1, 1_000, 10),
          booleanValue(values, "unique"),
        ),
      ),
  },
  {
    id: "generate-pis",
    title: "Gerador de PIS/PASEP",
    description: "Gera PIS/PASEP/NIS com dígito verificador válido.",
    category: "Geradores",
    icon: Icon.NumberList,
    fields: [maskField],
    run: (values) =>
      simpleResult("PIS/PASEP gerado", documentGenerators.pis(booleanValue(values, "masked", true))),
  },
  {
    id: "generate-renavam",
    title: "Gerador de RENAVAM",
    description: "Gera RENAVAM com dígito verificador válido.",
    category: "Geradores",
    icon: Icon.Car,
    run: () => simpleResult("RENAVAM gerado", documentGenerators.renavam()),
  },
  {
    id: "generate-vehicle",
    title: "Gerador de Veículos",
    description: "Gera um veículo mock completo em JSON.",
    category: "Geradores",
    icon: Icon.Car,
    run: generateVehicle,
  },
  {
    id: "generate-license-plate",
    title: "Gerador de Placa de Veículo",
    description: "Gera placa Mercosul ou no padrão brasileiro anterior.",
    category: "Geradores",
    icon: Icon.Car,
    fields: [
      {
        type: "dropdown",
        name: "format",
        title: "Padrão",
        defaultValue: "mercosul",
        options: [
          { title: "Mercosul", value: "mercosul" },
          { title: "Antigo (AAA-0000)", value: "legacy" },
        ],
      },
    ],
    run: (values) =>
      simpleResult(
        "Placa gerada",
        documentGenerators.licensePlate(stringValue(values, "format", "mercosul") as "mercosul" | "legacy"),
      ),
  },
  {
    id: "copy-symbols",
    title: "Símbolos para Copiar",
    description: "Coleções de símbolos Unicode úteis.",
    category: "Geradores",
    icon: Icon.Stars,
    fields: [
      {
        type: "dropdown",
        name: "collection",
        title: "Coleção",
        defaultValue: "Desenvolvimento",
        options: Object.keys(symbolCollections).map((name) => ({ title: name, value: name })),
      },
    ],
    run: (values) => {
      const collection = stringValue(
        values,
        "collection",
        "Desenvolvimento",
      ) as keyof typeof symbolCollections;
      return simpleResult(`Símbolos — ${collection}`, symbolCollections[collection]);
    },
  },
  {
    id: "generate-cnpj",
    title: "Gerador de CNPJ",
    description: "Gera CNPJ sintético com dígitos verificadores válidos.",
    category: "Geradores",
    icon: Icon.Building,
    fields: [maskField],
    run: (values) =>
      simpleResult("CNPJ gerado", documentGenerators.cnpj(booleanValue(values, "masked", true))),
  },
  {
    id: "generate-cep",
    title: "Gerador de CEP",
    description: "Gera CEP sintético dentro das faixas brasileiras.",
    category: "Geradores",
    icon: Icon.Pin,
    fields: [maskField],
    run: (values) => simpleResult("CEP gerado", documentGenerators.cep(booleanValue(values, "masked", true))),
  },
  {
    id: "generate-rg",
    title: "Gerador de RG",
    description: "Gera RG conforme as regras da UF selecionada.",
    category: "Geradores",
    icon: Icon.PersonCircle,
    fields: [ufField],
    run: (values) => simpleResult("RG gerado", generateRg(stringValue(values, "uf", "SP") as RgUfCode)),
  },
  {
    id: "generate-state-registration",
    title: "Gerador de Inscrição Estadual",
    description: "Gera IE com as regras da UF selecionada.",
    category: "Geradores",
    icon: Icon.Building,
    fields: [ufField, maskField],
    run: (values) =>
      simpleResult(
        "Inscrição Estadual gerada",
        documentGenerators.stateRegistration(
          stringValue(values, "uf", "SP") as UfCode,
          booleanValue(values, "masked", true),
        ),
      ),
  },
  {
    id: "generate-voter-registration",
    title: "Gerador de Título de Eleitor",
    description: "Gera título de eleitor sintético para uma UF.",
    category: "Geradores",
    icon: Icon.CheckCircle,
    fields: [ufField, maskField],
    run: (values) =>
      simpleResult(
        "Título de eleitor gerado",
        documentGenerators.voterRegistration(
          stringValue(values, "uf", "SP") as UfCode,
          booleanValue(values, "masked", true),
        ),
      ),
  },
  {
    id: "generate-credit-card",
    title: "Gerador de Cartão de Crédito",
    description: "Gera PAN sintético válido pelo algoritmo de Luhn.",
    category: "Geradores",
    icon: Icon.CreditCard,
    fields: [
      {
        type: "dropdown",
        name: "brand",
        title: "Bandeira",
        defaultValue: "visa",
        options: [
          { title: "Visa", value: "visa" },
          { title: "Mastercard", value: "mastercard" },
          { title: "American Express", value: "amex" },
          { title: "Elo", value: "elo" },
          { title: "Hipercard", value: "hipercard" },
        ],
      },
    ],
    run: (values) => {
      const brand = stringValue(values, "brand", "visa") as
        "visa" | "mastercard" | "amex" | "elo" | "hipercard";
      const number = documentGenerators.creditCard(brand);
      const cvv = brand === "amex" ? randomDigits(4) : randomDigits(3);
      const expiry = `${String(randomInt(1, 12)).padStart(2, "0")}/${String(new Date().getFullYear() + randomInt(2, 6)).slice(-2)}`;
      return {
        title: "Cartão de crédito mock",
        value: `${number}|${expiry}|${cvv}`,
        subtitle: "Número sintético para testes; nunca use em pagamentos reais.",
        metadata: [
          { label: "Número", value: number },
          { label: "Validade", value: expiry },
          { label: "CVV", value: cvv },
        ],
        sensitive: true,
      };
    },
  },
  {
    id: "generate-person",
    title: "Gerador de Pessoas",
    description: "Gera pessoa fictícia completa em JSON.",
    category: "Geradores",
    icon: Icon.Person,
    run: generatePerson,
  },
  {
    id: "generate-company",
    title: "Gerador de Empresas",
    description: "Gera empresa fictícia completa em JSON.",
    category: "Geradores",
    icon: Icon.Building,
    run: generateCompany,
  },
  {
    id: "generate-placeholder-image",
    title: "Gerador de Imagem",
    description: "Cria URL para imagem placeholder configurável.",
    category: "Geradores",
    icon: Icon.Image,
    fields: [
      textField("width", "Largura", "800", true, "800"),
      textField("height", "Altura", "600", true, "600"),
      textField("background", "Cor de fundo", "1F2937", true, "1F2937"),
      textField("foreground", "Cor do texto", "FFFFFF", true, "FFFFFF"),
      textField("text", "Texto", "Placeholder", true, "Placeholder"),
      {
        type: "dropdown",
        name: "format",
        title: "Formato",
        defaultValue: "png",
        options: [
          { title: "PNG", value: "png" },
          { title: "JPG", value: "jpg" },
          { title: "WebP", value: "webp" },
          { title: "SVG", value: "svg" },
        ],
      },
    ],
    run(values) {
      const width = numberValue(values, "width", 1, 4000, 800);
      const height = numberValue(values, "height", 1, 4000, 600);
      const background = stringValue(values, "background", "1F2937").replace(/[^a-fA-F0-9]/g, "") || "1F2937";
      const foreground = stringValue(values, "foreground", "FFFFFF").replace(/[^a-fA-F0-9]/g, "") || "FFFFFF";
      const format = stringValue(values, "format", "png");
      const url = `https://placehold.co/${width}x${height}/${background}/${foreground}.${format}?text=${encodeURIComponent(stringValue(values, "text", "Placeholder"))}`;
      return simpleResult("URL da imagem placeholder", url);
    },
  },
  {
    id: "generate-lorem-ipsum",
    title: "Gerador de Lorem Ipsum",
    description: "Gera parágrafos de texto placeholder.",
    category: "Geradores",
    icon: Icon.Paragraph,
    fields: [textField("paragraphs", "Parágrafos", "3", true, "3")],
    run: (values) => simpleResult("Lorem Ipsum", generateLorem(numberValue(values, "paragraphs", 1, 30, 3))),
  },
  {
    id: "generate-password",
    title: "Gerador de Senha",
    description: "Gera senha aleatória configurável localmente.",
    category: "Geradores",
    icon: Icon.Key,
    fields: [
      textField("length", "Tamanho", "24", true, "24"),
      { type: "checkbox", name: "upper", title: "Caracteres", label: "Maiúsculas", defaultValue: true },
      { type: "checkbox", name: "lower", title: "", label: "Minúsculas", defaultValue: true },
      { type: "checkbox", name: "numbers", title: "", label: "Números", defaultValue: true },
      { type: "checkbox", name: "symbols", title: "", label: "Símbolos", defaultValue: true },
    ],
    run: (values) =>
      simpleResult(
        "Senha gerada",
        generatePassword(numberValue(values, "length", 4, 256, 24), {
          upper: booleanValue(values, "upper", true),
          lower: booleanValue(values, "lower", true),
          numbers: booleanValue(values, "numbers", true),
          symbols: booleanValue(values, "symbols", true),
        }),
      ),
  },
  {
    id: "draw-numbers",
    title: "Sorteador de Números",
    description: "Sorteia números únicos dentro de um intervalo.",
    category: "Geradores",
    icon: Icon.Shuffle,
    fields: [
      textField("min", "Mínimo", "1", true, "1"),
      textField("max", "Máximo", "100", true, "100"),
      textField("amount", "Quantidade", "1", true, "1"),
    ],
    run: (values) =>
      simpleResult(
        "Resultado do sorteio",
        generateRandomNumbers(
          numberValue(values, "min", -1_000_000_000, 1_000_000_000, 1),
          numberValue(values, "max", -1_000_000_000, 1_000_000_000, 100),
          numberValue(values, "amount", 1, 1_000, 1),
          true,
        ),
      ),
  },
];
