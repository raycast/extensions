export function inrWordsToNumber(currencyWordArray: string[]): string {
  const split2DArray = splitArrayBy(currencyWordArray, "crore");
  let resultAbsInrCurrency = "";

  for (let i = 0; i < split2DArray.length; i++) {
    const lessThenCrorePart = split2DArray[i];
    if (lessThenCrorePart.length === 0 && i === 0) break;

    const currNumber =
      calcAbsNumberValueForLessThenCroreValue(lessThenCrorePart);
    if (currNumber.toString().length > 7) {
      throw new Error(
        lessThenCrorePart +
          " gives " +
          currNumber +
          " whose length is greater then 7. which should not be possible as we are calculating the value for less the crore",
      );
    }
    if (i === 0) {
      resultAbsInrCurrency += currNumber;
    } else {
      resultAbsInrCurrency += currNumber.toString().padStart(7, "0");
    }
  }

  return resultAbsInrCurrency.toString();
}

function splitArrayBy(
  currencyWordArray: string[],
  delimiter: string,
): string[][] {
  const splitSubarray: string[][] = [];
  let lastCroreSplitIdx = 0;
  for (let i = 0; i < currencyWordArray.length; i++) {
    const strElement = currencyWordArray[i];
    if (strElement === delimiter) {
      splitSubarray.push(currencyWordArray.slice(lastCroreSplitIdx, i));
      lastCroreSplitIdx = i + 1;
    }
  }
  splitSubarray.push(
    currencyWordArray.slice(lastCroreSplitIdx, currencyWordArray.length),
  );

  return splitSubarray;
}

function calcAbsNumberValueForLessThenCroreValue(
  lessThenCrorePart: string[],
): number {
  const magnitude: Record<string, number> = {
    lakh: 100000,
    thousand: 1000,
    hundred: 100,
  };
  let result = 0;
  for (let i = 0; i < lessThenCrorePart.length; i += 2) {
    const numericPart = parseFloat(lessThenCrorePart[i]);
    const magnitudePart = lessThenCrorePart[i + 1];
    const mag = magnitude[magnitudePart];
    const magnitudeElement = mag === undefined ? 1 : mag;
    result += numericPart * magnitudeElement;
  }

  return result;
}
