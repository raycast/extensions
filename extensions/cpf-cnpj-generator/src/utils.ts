/**
 * Function to generate a random number between a minimum and maximum value
 */
function generateRandomNumberBetweenRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Function to generate an array with an amount of random numbers
 */
function generateArrayOfRandomNumbers(amount: number) {
  const randomNumbers = [];
  for (let current = 0; current < amount; current++) {
    randomNumbers.push(generateRandomNumberBetweenRange(0, 9));
  }

  return randomNumbers;
}

/**
 * Function to round a number using 11 (cpf base) as divider
 */
function roundNumber(dirtyNumber: number) {
  return Math.round(dirtyNumber - Math.floor(dirtyNumber / 11) * 11);
}

/**
 * Function to change a value bigger than ten to zero
 */
function changeValueBiggerThanTenToZero(value: number) {
  if (value >= 10) return 0;
  return value;
}

type DocumentType = "cpf" | "cnpj";

/**
 * Function to generate a document with random numbers;
 */
export function generateDocumentByType(type: DocumentType = "cpf") {
  const [firstNumber, secondNumber, thirdNumber, fourthNumber, fifthNumber, sixthNumber, seventhNumber, eighthNumber] =
    generateArrayOfRandomNumbers(8);
  const ninthNumber = type === "cpf" ? generateRandomNumberBetweenRange(0, 9) : 0;

  if (type === "cpf") {
    const firstDigitDirty =
      11 -
      roundNumber(
        ninthNumber * 2 +
          eighthNumber * 3 +
          seventhNumber * 4 +
          sixthNumber * 5 +
          fifthNumber * 6 +
          fourthNumber * 7 +
          thirdNumber * 8 +
          secondNumber * 9 +
          firstNumber * 10
      );
    const firstDigit = changeValueBiggerThanTenToZero(firstDigitDirty);

    const secondDigitDirty =
      11 -
      roundNumber(
        firstDigit * 2 +
          ninthNumber * 3 +
          eighthNumber * 4 +
          seventhNumber * 5 +
          sixthNumber * 6 +
          fifthNumber * 7 +
          fourthNumber * 8 +
          thirdNumber * 9 +
          secondNumber * 10 +
          firstNumber * 11
      );
    const secondDigit = changeValueBiggerThanTenToZero(secondDigitDirty);

    const firstPart = `${firstNumber}${secondNumber}${thirdNumber}`;
    const secondPart = `${fourthNumber}${fifthNumber}${sixthNumber}`;
    const thirdPart = `${seventhNumber}${eighthNumber}${ninthNumber}`;
    const digits = `${firstDigit}${secondDigit}`;

    const document = `${firstPart}.${secondPart}.${thirdPart}-${digits}`;
    return document;
  }

  const tenthNumber = 0,
    eleventhNumber = 0,
    twelfthNumber = 0;

  const firstDigitDirty =
    11 -
    roundNumber(
      twelfthNumber * 2 +
        eleventhNumber * 3 +
        tenthNumber * 4 +
        ninthNumber * 5 +
        eighthNumber * 6 +
        seventhNumber * 7 +
        sixthNumber * 8 +
        fifthNumber * 9 +
        fourthNumber * 2 +
        thirdNumber * 3 +
        secondNumber * 4 +
        firstNumber * 5
    );
  const firstDigit = changeValueBiggerThanTenToZero(firstDigitDirty);

  const secondDigitDirty =
    11 -
    roundNumber(
      firstDigit * 2 +
        twelfthNumber * 3 +
        eleventhNumber * 4 +
        tenthNumber * 5 +
        ninthNumber * 6 +
        eighthNumber * 7 +
        seventhNumber * 8 +
        sixthNumber * 9 +
        fifthNumber * 2 +
        fourthNumber * 3 +
        thirdNumber * 4 +
        secondNumber * 5 +
        firstNumber * 6
    );
  const secondDigit = changeValueBiggerThanTenToZero(secondDigitDirty);

  const firstPart = `${firstNumber}${secondNumber}`;
  const secondPart = `${thirdNumber}${fourthNumber}${fifthNumber}`;
  const thirdPart = `${sixthNumber}${seventhNumber}${eighthNumber}`;
  const fourthPart = `${ninthNumber}${tenthNumber}${eleventhNumber}${twelfthNumber}`;
  const digits = `${firstDigit}${secondDigit}`;

  const document = `${firstPart}.${secondPart}.${thirdPart}/${fourthPart}-${digits}`;

  return document;
}
