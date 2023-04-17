import { characters } from "../formats";
import { IdsCharacters } from "../formats";

const randomNbr = () => {
  const nbr = Math.floor(Math.random() * (4 - 1) + 1);
  return nbr;
};

const randomWord = (length: number) => {
  let res = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    res += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return res.toLowerCase();
};

const randomParagraph = () => {
  const maxLength = Math.floor(Math.random() * (350 - 90) + 90);
  let res = "";
  let indexes = [];
  let nbrOfPeriods = randomNbr();

  while (res.length < maxLength) res += `${randomWord(Math.random() * 10)} `;
  let matches = res.matchAll(/ /g);

  for (let match of matches) indexes.push(match.index);

  res = res.replace(/\s+/g, " ").trim();
  while (nbrOfPeriods > 0) {
    const pos = indexes[Math.floor(Math.random() * indexes.length)];
    const capitalized = res.charAt((pos as number) + 1).toUpperCase();

    res = res.slice(0, pos) + "." + res.slice(pos);
    res = res.slice(0, (pos as number) + 2) + capitalized + res.slice((pos as number) + 3);
    indexes.splice(indexes.indexOf(pos), 1);
    --nbrOfPeriods;
  }
  res = res.charAt(0).toUpperCase() + res.slice(1);
  res += ".";
  return res;
};

export const getRandomParagraph = () => {
  return randomParagraph();
};

export const getRandomParagraphs = (pNbr: number) => {
  let res = "";
  while (pNbr > 0) {
    res += randomParagraph() + "\n";
    --pNbr;
  }
  return res;
};

export const getRandomStringId = (length: number) => {
  let res = "";
  const charactersLength = IdsCharacters.length;
  for (let i = 0; i < length; i++) {
    res += IdsCharacters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return res;
};

export const getRandomId = (length: number) => {
  const nbr = Math.floor(Math.random() * (100000 - 1) + 1);
  return nbr;
};
