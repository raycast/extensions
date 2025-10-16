import CreditCardTypes from "@mihnea.dev/credit-card-generator/dist/types/CreditCardTypes";
import { nomesFem } from "../data/nomes-fem";
import { nomesMasc } from "../data/nomes-masc";
import CreditCardGenerator from "@mihnea.dev/credit-card-generator";
import { sobrenomes } from "../data/sobrenomes";

interface CreditCardData {
  numero: string;
  expiracao: string;
  cvv: string;
  bandeira: string;
  titular: string;
}

export function cartao(): CreditCardData {
  const cardNumberAndFlag = generateCardNumber();
  const expirationDate = generateExpirationDate();
  const cvv = generateCVV();

  const masc = Math.random() < 0.5;

  const holderFirstName = masc
    ? nomesMasc[Math.floor(Math.random() * nomesMasc.length)]
    : nomesFem[Math.floor(Math.random() * nomesFem.length)];

  const holderLastName = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];

  return {
    numero: cardNumberAndFlag.cardNumber,
    expiracao: expirationDate,
    cvv,
    bandeira: cardNumberAndFlag.flag,
    titular: `${holderFirstName} ${holderLastName}`,
  };
}

function generateCardNumber(): { cardNumber: string; flag: string } {
  const type = Math.random() < 0.5 ? CreditCardTypes.VISA : CreditCardTypes.MasterCard;

  const creditCard = new CreditCardGenerator();
  const card = creditCard.generate_one(type);

  return {
    cardNumber: card.number.replace(/(.{4})/g, "$1-").slice(0, -1),
    flag: type,
  };
}

function generateExpirationDate(): string {
  const currentDate = new Date();
  const futureDate = new Date(
    currentDate.getFullYear() + Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 12),
    1,
  );

  const month = (futureDate.getMonth() + 1).toString().padStart(2, "0");
  const year = futureDate.getFullYear().toString().slice(-2);

  return `${month}-${year}`;
}

function generateCVV(): string {
  return Math.floor(Math.random() * 900 + 100).toString();
}
