// This code is ~stolen~ taked from niffresquinho.com

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCheckDigit(value: number): number {
  const nif = value.toString();

  const total =
    Number(nif[0]) * 9 +
    Number(nif[1]) * 8 +
    Number(nif[2]) * 7 +
    Number(nif[3]) * 6 +
    Number(nif[4]) * 5 +
    Number(nif[5]) * 4 +
    Number(nif[6]) * 3 +
    Number(nif[7]) * 2;

  const modulo11 = total % 11;

  const checkDigit = modulo11 < 2 ? 0 : 11 - modulo11;

  return checkDigit;
}

function getNif(minAndMax: string) {
  const minAndMaxSplitted = minAndMax.split("|");

  const min = parseInt(minAndMaxSplitted[0]);
  const max = parseInt(minAndMaxSplitted[1]);

  const random = getRandomInt(min, max);

  const checkDigit = getCheckDigit(random);

  const nif = random.toString() + checkDigit.toString();

  return nif;
}

export { getNif };
