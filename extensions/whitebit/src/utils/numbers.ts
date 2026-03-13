const formatter = Intl.NumberFormat("en-US", {
  maximumFractionDigits: 20,
});

const exactFormatter = Intl.NumberFormat("en-US", {
  maximumFractionDigits: 20,
  minimumFractionDigits: 20,
});

const compactFormatter = Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 20,
});

export function formatNumber(number?: number | string | null, precision = 8, exact = false, compact = false) {
  let formattedNumber = number;

  if (number === undefined || number === null) {
    formattedNumber = 0;
  }

  if (exact) {
    formattedNumber = exactFormatter.format(formattedNumber as number);
  } else if (compact) {
    formattedNumber = compactFormatter.format(formattedNumber as number);

    if (precision !== undefined) {
      const [value, suffix] = formattedNumber.split(/(?=[A-Za-z])/);

      let [firstPart, secondPart] = value.split(".");

      if (secondPart === undefined || precision === 0) {
        if (suffix !== undefined) {
          firstPart += suffix;
        }

        return firstPart;
      }

      secondPart = secondPart.slice(0, precision);

      if (+secondPart === 0 && !exact) {
        if (suffix !== undefined) {
          firstPart += suffix;
        }

        return firstPart;
      }

      formattedNumber = `${firstPart}.${secondPart}`;

      if (suffix !== undefined) {
        formattedNumber += suffix;
      }
    }

    return formattedNumber;
  } else {
    const isArrow = /[<>]/g.test(formattedNumber!.toString());

    if (formattedNumber && isArrow) {
      const [_, value] = formattedNumber.toString().split("<" || ">");
      formatter.format(Number(value));
    } else {
      formattedNumber = formatter.format(formattedNumber as number);
    }
  }

  if (precision !== undefined) {
    // eslint-disable-next-line prefer-const
    let [firstPart, secondPart] = formattedNumber.toString().split(".");

    if (secondPart === undefined || precision === 0) {
      return firstPart;
    }

    secondPart = secondPart.slice(0, precision);

    if (+secondPart === 0 && !exact) {
      return firstPart;
    }

    formattedNumber = `${firstPart}.${secondPart}`;
  }

  return formattedNumber;
}
