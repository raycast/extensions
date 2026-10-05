import { describe, expect, it } from "vitest";
import {
  validateCnh,
  validateCnpj,
  validateCpf,
  validateInscricaoEstadual,
  validatePisPasep,
  validateRenavam,
  validateRg,
  validateTituloEleitor,
} from "@br-validators/core";
import {
  documentGenerators,
  generateBankAccount,
  generateCertificateRegistration,
  generateRg,
  validateBankAccount,
  validateCertificateRegistration,
} from "../src/lib/documents";

describe("geradores documentais", () => {
  it("gera documentos aceitos pelos validadores oficiais da biblioteca", () => {
    expect(validateCpf(documentGenerators.cpf()).ok).toBe(true);
    expect(validateCnpj(documentGenerators.cnpj()).ok).toBe(true);
    expect(validateCnh(documentGenerators.cnh()).ok).toBe(true);
    expect(validatePisPasep(documentGenerators.pis()).ok).toBe(true);
    expect(validateRenavam(documentGenerators.renavam()).ok).toBe(true);
    expect(validateTituloEleitor(documentGenerators.voterRegistration("MA")).ok).toBe(true);
    expect(validateInscricaoEstadual(documentGenerators.stateRegistration("SP"), { uf: "SP" }).ok).toBe(true);
  });

  it("gera RG válido para SP", () => {
    expect(validateRg(generateRg("SP"), { uf: "SP" }).ok).toBe(true);
  });

  it("gera e valida matrícula de certidão com 32 dígitos", () => {
    const registration = generateCertificateRegistration();
    expect(registration).toMatch(/^\d{32}$/);
    expect(validateCertificateRegistration(registration).title).toContain("válido");
  });

  it("gera e valida conta bancária mock", () => {
    const account = generateBankAccount("001");
    expect(validateBankAccount(account.value).title).toContain("válido");
  });
});
