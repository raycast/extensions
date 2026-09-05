import { Icon } from "@raycast/api";
import type { RgUfCode, UfCode } from "@br-validators/core";
import type { ToolDefinition } from "../types";
import {
  documentValidators,
  ufOptions,
  validateBankAccount,
  validateCertificateRegistration,
} from "../lib/documents";
import { stringValue, textField } from "./helpers";

const valueField = (placeholder: string) => textField("value", "Valor", placeholder);
const ufField = {
  type: "dropdown" as const,
  name: "uf",
  title: "UF",
  defaultValue: "SP",
  options: ufOptions.map((uf) => ({ title: uf, value: uf })),
};

export const validatorTools: ToolDefinition[] = [
  {
    id: "validate-credit-card",
    title: "Validador de Cartão de Crédito",
    description: "Valida o número pelo algoritmo de Luhn e identifica a estrutura.",
    category: "Validadores",
    icon: Icon.CreditCard,
    fields: [valueField("4111 1111 1111 1111")],
    run: (values) => documentValidators.creditCard(stringValue(values, "value")),
  },
  {
    id: "validate-bank-account",
    title: "Validador de Conta Bancária",
    description: "Valida contas mock produzidas pela extensão.",
    category: "Validadores",
    icon: Icon.BankNote,
    fields: [valueField("001|1234-0|12345678-0")],
    run: (values) => validateBankAccount(stringValue(values, "value")),
  },
  {
    id: "validate-certificate",
    title: "Validador de Certidões",
    description: "Valida formato e dígitos da matrícula de certidão civil.",
    category: "Validadores",
    icon: Icon.Document,
    fields: [valueField("Matrícula com 32 dígitos")],
    run: (values) => validateCertificateRegistration(stringValue(values, "value")),
  },
  {
    id: "validate-cnh",
    title: "Validador de CNH",
    description: "Valida tamanho e dígitos verificadores da CNH.",
    category: "Validadores",
    icon: Icon.Person,
    fields: [valueField("Número da CNH")],
    run: (values) => documentValidators.cnh(stringValue(values, "value")),
  },
  {
    id: "validate-cnpj",
    title: "Validador de CNPJ",
    description: "Valida CNPJ numérico ou alfanumérico.",
    category: "Validadores",
    icon: Icon.Building,
    fields: [valueField("00.000.000/0000-00")],
    run: (values) => documentValidators.cnpj(stringValue(values, "value")),
  },
  {
    id: "validate-cpf",
    title: "Validador de CPF",
    description: "Valida CPF e seus dígitos verificadores.",
    category: "Validadores",
    icon: Icon.PersonCircle,
    fields: [valueField("000.000.000-00")],
    run: (values) => documentValidators.cpf(stringValue(values, "value")),
  },
  {
    id: "validate-pis",
    title: "Validador de PIS/PASEP",
    description: "Valida PIS, PASEP ou NIS.",
    category: "Validadores",
    icon: Icon.NumberList,
    fields: [valueField("000.00000.00-0")],
    run: (values) => documentValidators.pis(stringValue(values, "value")),
  },
  {
    id: "validate-renavam",
    title: "Validador de RENAVAM",
    description: "Valida RENAVAM e seu dígito verificador.",
    category: "Validadores",
    icon: Icon.Car,
    fields: [valueField("00000000000")],
    run: (values) => documentValidators.renavam(stringValue(values, "value")),
  },
  {
    id: "validate-rg",
    title: "Validador de RG",
    description: "Valida RG conforme a regra da UF selecionada.",
    category: "Validadores",
    icon: Icon.PersonCircle,
    fields: [ufField, valueField("Número do RG")],
    run: (values) =>
      documentValidators.rg(stringValue(values, "value"), stringValue(values, "uf", "SP") as RgUfCode),
  },
  {
    id: "validate-voter-registration",
    title: "Validador de Título de Eleitor",
    description: "Valida título de eleitor e seus dígitos verificadores.",
    category: "Validadores",
    icon: Icon.CheckCircle,
    fields: [valueField("0000 0000 0000")],
    run: (values) => documentValidators.voterRegistration(stringValue(values, "value")),
  },
  {
    id: "validate-state-registration",
    title: "Validador de Inscrição Estadual",
    description: "Valida Inscrição Estadual conforme a UF.",
    category: "Validadores",
    icon: Icon.Building,
    fields: [ufField, valueField("Inscrição Estadual")],
    run: (values) =>
      documentValidators.stateRegistration(
        stringValue(values, "value"),
        stringValue(values, "uf", "SP") as UfCode,
      ),
  },
];
