export const formatCPF = (cpf: string) => {
  // 000.000.000-00
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
};
