import {
  formatCnh,
  formatCnpj,
  formatCpf,
  formatInscricaoEstadual,
  formatPisPasep,
  formatRenavam,
  formatRg,
  formatTituloEleitor,
  RG_UF_RULES,
  validateCartaoCredito,
  validateCnh,
  validateCnpj,
  validateCpf,
  validateInscricaoEstadual,
  validatePisPasep,
  validateRenavam,
  validateRg,
  validateTituloEleitor,
  type RgUfCode,
  type UfCode,
} from "@br-validators/core";
import { generate } from "@br-validators/core/generate";
import type { ToolResult } from "../types";
import { onlyDigits, randomDigits, randomInt, randomItem } from "./shared";

export const ufOptions = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export type DocumentValidation =
  { ok: true; value: string; format?: string } | { ok: false; code: string; message: string };

export function validationToolResult(
  title: string,
  input: string,
  result: DocumentValidation,
  formatted?: string,
): ToolResult {
  if (result.ok) {
    return {
      title: `${title} válido`,
      value: formatted ?? result.value,
      subtitle: "A estrutura e os dígitos verificadores são válidos.",
      metadata: [
        { label: "Entrada", value: input },
        { label: "Normalizado", value: result.value },
        { label: "Status", value: "Válido" },
      ],
    };
  }

  return {
    title: `${title} inválido`,
    value: input,
    subtitle: result.message,
    metadata: [
      { label: "Status", value: "Inválido" },
      { label: "Código", value: result.code },
      { label: "Motivo", value: result.message },
    ],
  };
}

function formattedValue(result: { ok: true; formatted: string } | { ok: false }): string | undefined {
  return result.ok ? result.formatted : undefined;
}

export const documentGenerators = {
  cpf(masked = true): string {
    return generate("cpf", { masked });
  },
  cnpj(masked = true): string {
    return generate("cnpj", { masked });
  },
  cep(masked = true): string {
    return generate("cep", { masked });
  },
  cnh(): string {
    return generate("cnh");
  },
  pis(masked = true): string {
    return generate("pis-pasep", { masked });
  },
  renavam(): string {
    return generate("renavam");
  },
  voterRegistration(uf: UfCode, masked = true): string {
    return generate("titulo-eleitor", { uf, masked });
  },
  stateRegistration(uf: UfCode, masked = true): string {
    return generate("inscricao-estadual", { uf, masked });
  },
  licensePlate(format: "legacy" | "mercosul"): string {
    return generate("placa", { format });
  },
  creditCard(brand: "visa" | "mastercard" | "amex" | "elo" | "hipercard" = "visa"): string {
    return generate("cartao-credito", { brand, masked: true });
  },
};

export const documentValidators = {
  cpf(input: string): ToolResult {
    const result = validateCpf(input);
    return validationToolResult(
      "CPF",
      input,
      result,
      result.ok ? formattedValue(formatCpf(result.value)) : undefined,
    );
  },
  cnpj(input: string): ToolResult {
    const result = validateCnpj(input);
    return validationToolResult(
      "CNPJ",
      input,
      result,
      result.ok ? formattedValue(formatCnpj(result.value)) : undefined,
    );
  },
  cnh(input: string): ToolResult {
    const result = validateCnh(input);
    return validationToolResult(
      "CNH",
      input,
      result,
      result.ok ? formattedValue(formatCnh(result.value)) : undefined,
    );
  },
  pis(input: string): ToolResult {
    const result = validatePisPasep(input);
    return validationToolResult(
      "PIS/PASEP",
      input,
      result,
      result.ok ? formattedValue(formatPisPasep(result.value)) : undefined,
    );
  },
  renavam(input: string): ToolResult {
    const result = validateRenavam(input);
    return validationToolResult(
      "RENAVAM",
      input,
      result,
      result.ok ? formattedValue(formatRenavam(result.value)) : undefined,
    );
  },
  voterRegistration(input: string): ToolResult {
    const result = validateTituloEleitor(input);
    return validationToolResult(
      "Título de eleitor",
      input,
      result,
      result.ok ? formattedValue(formatTituloEleitor(result.value)) : undefined,
    );
  },
  stateRegistration(input: string, uf: UfCode): ToolResult {
    const result = validateInscricaoEstadual(input, { uf });
    return validationToolResult(
      `Inscrição Estadual (${uf})`,
      input,
      result,
      result.ok ? formattedValue(formatInscricaoEstadual(result.value, { uf })) : undefined,
    );
  },
  rg(input: string, uf: RgUfCode): ToolResult {
    const result = validateRg(input, { uf });
    return validationToolResult(
      `RG (${uf})`,
      input,
      result,
      result.ok ? formattedValue(formatRg(result.value, { uf })) : undefined,
    );
  },
  creditCard(input: string): ToolResult {
    return validationToolResult("Cartão", input, validateCartaoCredito(input));
  },
};

export function generateRg(uf: RgUfCode): string {
  const rules = RG_UF_RULES[uf];
  for (let attempt = 0; attempt < 20_000; attempt += 1) {
    const candidate = randomDigits(rules.canonicalLength);
    const result = validateRg(candidate, { uf });
    if (result.ok) return formattedValue(formatRg(result.value, { uf })) ?? result.value;
  }
  throw new Error(`Não foi possível gerar um RG para ${uf}.`);
}

function mod97(value: string): number {
  let remainder = 0;
  for (const character of value) remainder = (remainder * 10 + Number(character)) % 97;
  return remainder;
}

export function generateCertificateRegistration(): string {
  const base = `${randomDigits(6)}${String(randomInt(1, 99)).padStart(2, "0")}${String(randomInt(1, 99)).padStart(2, "0")}${randomInt(1950, 2099)}${randomInt(1, 3)}${randomDigits(5)}${randomDigits(3)}${randomDigits(7)}`;
  const checkDigits = String(98 - mod97(`${base}00`)).padStart(2, "0");
  return `${base}${checkDigits}`;
}

export function formatCertificateRegistration(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length !== 32) return value;
  return `${digits.slice(0, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 14)} ${digits.slice(14, 15)} ${digits.slice(15, 20)} ${digits.slice(20, 23)} ${digits.slice(23, 30)} ${digits.slice(30)}`;
}

export function validateCertificateRegistration(input: string): ToolResult {
  const digits = onlyDigits(input);
  const validLength = digits.length === 32;
  const validCheckDigits = validLength && Number(digits.slice(-2)) === 98 - mod97(`${digits.slice(0, 30)}00`);
  return validationToolResult(
    "Matrícula de certidão",
    input,
    validLength && validCheckDigits
      ? { ok: true, value: digits, format: "certidao" }
      : {
          ok: false,
          code: validLength ? "INVALID_CHECK_DIGIT" : "INVALID_LENGTH",
          message: validLength
            ? "Os dígitos verificadores não conferem."
            : "A matrícula deve ter 32 dígitos.",
        },
    validLength && validCheckDigits ? formatCertificateRegistration(digits) : undefined,
  );
}

type BankDefinition = { code: string; name: string; agencyLength: number; accountLength: number };

export const banks: Record<string, BankDefinition> = {
  "001": { code: "001", name: "Banco do Brasil", agencyLength: 4, accountLength: 8 },
  "033": { code: "033", name: "Santander", agencyLength: 4, accountLength: 8 },
  "104": { code: "104", name: "Caixa Econômica Federal", agencyLength: 4, accountLength: 8 },
  "237": { code: "237", name: "Bradesco", agencyLength: 4, accountLength: 7 },
  "260": { code: "260", name: "Nubank", agencyLength: 4, accountLength: 8 },
  "341": { code: "341", name: "Itaú", agencyLength: 4, accountLength: 5 },
};

function bankCheckDigit(value: string): string {
  const digits = onlyDigits(value);
  let sum = 0;
  let weight = 2;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += Number(digits[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  return String(remainder < 2 ? 0 : 11 - remainder);
}

export function generateBankAccount(bankCode: string): ToolResult {
  const bank = banks[bankCode] ?? banks["001"];
  const agencyBase = randomDigits(bank.agencyLength);
  const accountBase = randomDigits(bank.accountLength);
  const agency = `${agencyBase}-${bankCheckDigit(`${bank.code}${agencyBase}`)}`;
  const account = `${accountBase}-${bankCheckDigit(`${bank.code}${agencyBase}${accountBase}`)}`;
  const value = `${bank.code}|${agency}|${account}`;
  return {
    title: "Conta bancária mock",
    value,
    subtitle: "Estrutura sintética para testes; não representa uma conta existente.",
    metadata: [
      { label: "Banco", value: `${bank.code} — ${bank.name}` },
      { label: "Agência", value: agency },
      { label: "Conta", value: account },
      { label: "Formato compacto", value },
    ],
  };
}

export function validateBankAccount(input: string): ToolResult {
  const [bankCode = "", rawAgency = "", rawAccount = ""] = input.split("|").map((part) => part.trim());
  const bank = banks[bankCode];
  const [agencyBase, agencyDv] = rawAgency.split("-");
  const [accountBase, accountDv] = rawAccount.split("-");
  const valid =
    Boolean(bank) &&
    agencyBase?.length === bank.agencyLength &&
    accountBase?.length === bank.accountLength &&
    agencyDv === bankCheckDigit(`${bankCode}${agencyBase}`) &&
    accountDv === bankCheckDigit(`${bankCode}${agencyBase}${accountBase}`);

  return validationToolResult(
    "Conta bancária mock",
    input,
    valid
      ? { ok: true, value: `${bankCode}|${rawAgency}|${rawAccount}`, format: "bank-account" }
      : {
          ok: false,
          code: "INVALID_CHECK_DIGIT",
          message: "Use banco|agência-dígito|conta-dígito e confira os dados gerados por esta extensão.",
        },
  );
}

export const vehicleBrands = [
  "Chevrolet",
  "Fiat",
  "Ford",
  "Honda",
  "Hyundai",
  "Jeep",
  "Toyota",
  "Volkswagen",
];
export const vehicleModels: Record<string, string[]> = {
  Chevrolet: ["Onix", "Tracker", "S10"],
  Fiat: ["Argo", "Mobi", "Pulse", "Toro"],
  Ford: ["Ranger", "Territory", "Maverick"],
  Honda: ["City", "Civic", "HR-V"],
  Hyundai: ["HB20", "Creta", "Tucson"],
  Jeep: ["Compass", "Renegade", "Commander"],
  Toyota: ["Corolla", "Yaris", "Hilux"],
  Volkswagen: ["Polo", "T-Cross", "Nivus", "Saveiro"],
};

export function generateVehicle(): ToolResult {
  const brand = randomItem(vehicleBrands);
  const year = randomInt(2005, new Date().getFullYear() + 1);
  const data = {
    marca: brand,
    modelo: randomItem(vehicleModels[brand]),
    anoFabricacao: year - randomInt(0, 1),
    anoModelo: year,
    placa: documentGenerators.licensePlate("mercosul"),
    renavam: documentGenerators.renavam(),
    cor: randomItem(["Branco", "Preto", "Prata", "Cinza", "Azul", "Vermelho"]),
    combustivel: randomItem(["Flex", "Gasolina", "Diesel", "Elétrico", "Híbrido"]),
    chassi: `${randomLettersAndDigits(17)}`,
  };
  return {
    title: "Veículo mock",
    value: JSON.stringify(data, null, 2),
    metadata: [{ label: "Placa", value: data.placa }],
  };
}

function randomLettersAndDigits(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  return Array.from({ length }, () => randomItem(alphabet.split(""))).join("");
}
