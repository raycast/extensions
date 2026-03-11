export const isAlphanumericCNPJ = (cnpj: string) => {
  const regexCNPJ = /^([A-Z\d]){12}(\d){2}$/;

  return regexCNPJ.test(cnpj);
};
