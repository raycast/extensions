const POSSIBLE_NUMBERS: readonly string[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const POSSIBLE_THIRD_NUMBER: readonly string[] = ["2", "3", "4", "5", "6", "7", "8", "9"] as const;
const VALID_CLASS_NUMBERS: readonly string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const CHARCODE_0: number = "0".charCodeAt(0);
const VALID_LENGTHS: readonly number[] = [10, 12] as const;
const MAPPING_EVEN: readonly number[] = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9] as const;

const getLuhnRemainder = (value: string): number => {
  let length = value.length,
    accumulator = 0,
    bit = 0;

  while (length-- > 0) {
    bit ^= 1;
    accumulator += bit ? value.charCodeAt(length) - CHARCODE_0 : MAPPING_EVEN[value.charCodeAt(length) - CHARCODE_0];
  }

  return accumulator % 10;
};

function getControlNumber(rawValue: string): string {
  const value = rawValue;

  return value + ((10 - getLuhnRemainder(`${value}0`)) % 10).toString();
}

function getRandomFromArray<T>(array: readonly T[]): T {
  const index = Math.floor(Math.random() * array.length);
  const entry = array[index];

  return entry;
}

interface OrganizationNumberOptions {
  classNumber?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  length?: 10 | 12;
  withSeparator?: boolean;
}

export const generateOrganizationNumber = ({
  classNumber = "5",
  length = 10,
  withSeparator = false,
}: OrganizationNumberOptions = {}): string => {
  const classNumberString = classNumber.toString();

  if (VALID_CLASS_NUMBERS.indexOf(classNumberString) === -1) {
    throw new Error(
      "Invalid classNumber, should be a 1-9, see https://sv.wikipedia.org/wiki/Organisationsnummer#Organisationsnummer for examples",
    );
  }

  if (VALID_LENGTHS.indexOf(length) === -1) {
    throw new Error("Invalid length, should be 10 or 12, see https://sv.wikipedia.org/wiki/Organisationsnummer");
  }

  const orgNrArray = [classNumberString];

  for (let i = 0; i < 8; i++) {
    const nextNumber = getRandomFromArray(i === 1 ? POSSIBLE_THIRD_NUMBER : POSSIBLE_NUMBERS);
    orgNrArray.push(nextNumber);
  }

  const orgNr = getControlNumber(orgNrArray.join("")),
    orgNrWithSeparator = withSeparator ? `${orgNr.slice(0, 6)}-${orgNr.slice(6)}` : orgNr;

  return length === 10 ? orgNrWithSeparator : `16${orgNrWithSeparator}`;
};
