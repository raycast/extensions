export const calcCheckDigits = (cnpj: string) => {
  const IMPORTANCE_ARRAY = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const DIFFERENCE_FROM_ASCII_TO_VALUE = 48;
  let sumFirstCheckDigit = 0;
  let sumSecondCheckDigit = 0;

  for (let i = 0; i < 12; i++) {
    const asciiCode = cnpj.codePointAt(i) as number;
    const calcValue = asciiCode - DIFFERENCE_FROM_ASCII_TO_VALUE;

    sumFirstCheckDigit += calcValue * IMPORTANCE_ARRAY[i + 1];
    sumSecondCheckDigit += calcValue * IMPORTANCE_ARRAY[i];
  }

  const remainerFirstCheckDigit = sumFirstCheckDigit % 11;
  const firstCheckDigit = remainerFirstCheckDigit < 2 ? 0 : 11 - remainerFirstCheckDigit;

  sumSecondCheckDigit += firstCheckDigit * IMPORTANCE_ARRAY[12];
  const remainerSecondCheckDigit = sumSecondCheckDigit % 11;
  const secondCheckDigit = remainerSecondCheckDigit % 11 < 2 ? 0 : 11 - (remainerSecondCheckDigit % 11);

  return `${firstCheckDigit}${secondCheckDigit}`;
};
