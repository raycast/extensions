import { nomesFem } from "../data/nomes-fem";
import { nomesMasc } from "../data/nomes-masc";
import { sobrenomes } from "../data/sobrenomes";
import { cleanString } from "../utils/utils";

const create_array = (total: number, numero: number): number[] =>
  Array.from(Array(total), () => Math.round(Math.random() * numero));

const mod = (dividendo: number, divisor: number) => Math.round(dividendo - Math.floor(dividendo / divisor) * divisor);

export function cpf(mask?: boolean) {
  const total_array = 9;
  const n = 9;
  const [n1, n2, n3, n4, n5, n6, n7, n8, n9] = create_array(total_array, n);

  let d1 = n9! * 2 + n8! * 3 + n7! * 4 + n6! * 5 + n5! * 6 + n4! * 7 + n3! * 8 + n2! * 9 + n1! * 10;
  d1 = 11 - mod(d1, 11);
  if (d1 >= 10) d1 = 0;

  let d2 = d1 * 2 + n9! * 3 + n8! * 4 + n7! * 5 + n6! * 6 + n5! * 7 + n4! * 8 + n3! * 9 + n2! * 10 + n1! * 11;
  d2 = 11 - mod(d2, 11);
  if (d2 >= 10) d2 = 0;

  if (mask) {
    return `${n1}${n2}${n3}.${n4}${n5}${n6}.${n7}${n8}${n9}-${d1}${d2}`;
  }

  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

export function rg(mask?: boolean) {
  const total_array = 8;
  const n = 9;
  const [n1, n2, n3, n4, n5, n6, n7, n8] = create_array(total_array, n);
  const d1 = 0;
  const d2 = 0;

  if (mask) {
    return `${n1}${n2}.${n3}${n4}${n5}.${n6}${n7}${n8}-${d1}${d2}`;
  }

  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${d1}${d2}`;
}

export function email(nome: string) {
  const dom = [
    "@gmail.com",
    "@hotmail.com",
    "@outlook.com",
    "@yahoo.com",
    "@bol.com.br",
    "@uol.com.br",
    "@terra.com.br",
    "@globo.com",
  ];

  return `${cleanString(nome.toLowerCase().replaceAll(" ", "_"))}${dom[Math.floor(Math.random() * dom.length)]}`;
}

export function aniversario() {
  const dia = Math.floor(Math.random() * 28) + 1;
  const mes = Math.floor(Math.random() * 12) + 1;
  const ano = Math.floor(Math.random() * (2003 - 1950)) + 1950;

  return `${ano}-${mes < 10 ? "0" + mes : mes}-${dia < 10 ? "0" + dia : dia}`;
}

function signo(dataNascimento: string) {
  const data = new Date(dataNascimento);
  const mes = data.getMonth();
  const dia = data.getDate();

  switch (true) {
    case (mes === 0 && dia >= 20) || (mes === 1 && dia <= 18):
      return "Aquário";
    case (mes === 1 && dia >= 19) || (mes === 2 && dia <= 20):
      return "Peixes";
    case (mes === 2 && dia >= 21) || (mes === 3 && dia <= 19):
      return "Áries";
    case (mes === 3 && dia >= 20) || (mes === 4 && dia <= 20):
      return "Touro";
    case (mes === 4 && dia >= 21) || (mes === 5 && dia <= 20):
      return "Gêmeos";
    case (mes === 5 && dia >= 21) || (mes === 6 && dia <= 22):
      return "Câncer";
    case (mes === 6 && dia >= 23) || (mes === 7 && dia <= 22):
      return "Leão";
    case (mes === 7 && dia >= 23) || (mes === 8 && dia <= 22):
      return "Virgem";
    case (mes === 8 && dia >= 23) || (mes === 9 && dia <= 22):
      return "Libra";
    case (mes === 9 && dia >= 23) || (mes === 10 && dia <= 21):
      return "Escorpião";
    case (mes === 10 && dia >= 22) || (mes === 11 && dia <= 21):
      return "Sagitário";
    case (mes === 11 && dia >= 22) || (mes === 0 && dia <= 19):
      return "Capricórnio";
    default:
      return "Data inválida";
  }
}

export function personData(mask?: boolean) {
  const masc = Math.random() < 0.5;

  const nome = masc
    ? nomesMasc[Math.floor(Math.random() * nomesMasc.length)]
    : nomesFem[Math.floor(Math.random() * nomesFem.length)];

  const sobrenome = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];

  const dataNascimento = aniversario();

  if (!nome || !sobrenome) throw new Error("Nome ou sobrenome não encontrado");

  return {
    nome: nome + " " + sobrenome,
    sexo: masc ? "Masculino" : "Feminino",
    email: email(nome + " " + sobrenome),
    dataNascimento,
    signo: signo(dataNascimento),
    cpf: cpf(mask),
    rg: rg(mask),
    nomePai: nomesMasc[Math.floor(Math.random() * nomesMasc.length)] + " " + sobrenome,
    nomeMae:
      nomesFem[Math.floor(Math.random() * nomesFem.length)] +
      " " +
      sobrenomes[Math.floor(Math.random() * sobrenomes.length)],
  };
}
