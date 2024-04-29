abstract class BinaryFloat {
  sign = 0;
  exponent = 0;
  mantissa = "0";
  fixedBinary: string;
  floatBinary = "";
  protected constructor(number: string) {
    this.fixedBinary = number;
    this.setSign();
    this.setExponentAndMantissa();
    this.setFloatBinary();
  }

  /**
   * Returns the sign of the number
   */
  abstract setSign(): void;

  /**
   * Returns the exponent of the number
   */
  abstract setExponentAndMantissa(): void;

  /**
   * Sets the float binary of the number
   */
  abstract setFloatBinary(): void;

  getMantissa(): string {
    return this.mantissa;
  }

  getExponent(): number {
    return this.exponent;
  }

  getSign(): number {
    return this.sign;
  }

  getFloatBinary(): string {
    return this.floatBinary;
  }

  abstract getFloatDecimal(): string;
}

export class SinglePrecision extends BinaryFloat {
  constructor(number: string) {
    super(number);
  }

  setExponentAndMantissa(): void {
    //the exponent is how many places the comma has to be moved, so that only a 1 is at the front + 127
    //if the number is negative, the exponent is 127 - the number of places the comma has to be moved
    const { delta, mantissa } = normalizeNumber(this.fixedBinary);
    this.exponent = delta + 127;
    this.mantissa = mantissa;
  }

  getMantissa(): string {
    return this.mantissa;
  }

  setSign(): void {
    //if the number is negative return 1
    //if the number is positive return 0
    console.log(this.fixedBinary[0]);
    if (this.fixedBinary[0] === "-") {
      this.sign = 1;
    } else {
      this.sign = 0;
    }
  }

  setFloatBinary(): void {
    //check if the mantissa is longer than 23 bits
    if (this.mantissa.length > 23) {
      //if it is, cut off the rest
      this.mantissa = this.mantissa.slice(0, 23);
    }

    this.floatBinary =
      this.sign.toString() +
      " " +
      this.exponent.toString(2) +
      "0".repeat(8 - this.exponent.toString(2).length) +
      " " +
      this.mantissa +
      "0".repeat(23 - this.mantissa.length);
  }

  getFloatDecimal(): string {
    //convert the float binary to decimal
    let decimal = 0;
    for (let i = 0; i < this.mantissa.length; i++) {
      decimal += parseInt(this.mantissa[i]) * Math.pow(2, -1 * (i + 1));
    }
    //add 1 to the decimal
    decimal += 1;
    //multiply the decimal with 2 to the power of the exponent - 127
    decimal *= Math.pow(2, this.exponent - 127);
    //if the sign is 1, the number is negative
    if (this.sign === 1) {
      decimal *= -1;
    }
    return decimal.toString();
  }
}

export class DoublePrecision extends BinaryFloat {
  getFloatDecimal(): string {
    //convert the mantissa to decimal
    let mantissa = 0;
    for (let i = 0; i < this.mantissa.length; i++) {
      mantissa += parseInt(this.mantissa[i]) * Math.pow(2, -1 * (i + 1));
    }
    //add 1 to the mantissa
    mantissa += 1;
    //multiply the mantissa with 2 to the power of the exponent - 127
    mantissa *= Math.pow(2, this.exponent - 1023);
    //if the sign is 1, the number is negative
    if (this.sign === 1) {
      mantissa *= -1;
    }
    return mantissa.toString();
  }
  constructor(number: string) {
    super(number);
  }

  setExponentAndMantissa(): void {
    //the exponent is how many places the comma has to be moved, so that only a 1 is at the front + 127
    //if the number is negative, the exponent is 127 - the number of places the comma has to be moved
    const { delta, mantissa } = normalizeNumber(this.fixedBinary);
    this.exponent = delta + 1023;
    this.mantissa = mantissa;
  }

  getMantissa(): string {
    return this.mantissa;
  }

  setSign(): void {
    //if the number is negative return 1
    //if the number is positive return 0
    if (this.fixedBinary[0] === "-") {
      this.sign = 1;
    } else {
      this.sign = 0;
    }
  }

  setFloatBinary(): void {
    //check if the mantissa is longer than 23 bits
    if (this.mantissa.length > 52) {
      //if it is, cut off the rest
      this.mantissa = this.mantissa.slice(0, 52);
    }

    this.floatBinary =
      this.sign.toString() +
      " " +
      this.exponent.toString(2) +
      "0".repeat(11 - this.exponent.toString(2).length) +
      " " +
      this.mantissa +
      "0".repeat(52 - this.mantissa.length);
  }
}

/**
 * Returns the delta (exponent) and the mantissa of the normalized number
 * @param fixedPoint the number to normalize in the form of a fixed point binary number
 * @returns {{delta: number, mantissa: string}}
 */
function normalizeNumber(fixedPoint: string): { delta: number; mantissa: string } {
  //if the number is negative, remove the minus sign
  fixedPoint = fixedPoint.replace("-", "");
  //if the number is positive, remove the plus sign
  fixedPoint = fixedPoint.replace("+", "");

  //normalize comma notation
  fixedPoint = fixedPoint.replace(",", ".");

  //convert the number to an array
  let fixedPointArray = fixedPoint.split("");
  //find the closest 1 to the comma
  const commaIndex = fixedPointArray.indexOf(".");

  let closestOneIndex = NaN;

  const farthestOneIndex = NaN;

  fixedPointArray = fixedPointArray.filter(function (letter) {
    return letter != ",";
  });

  console.log(fixedPointArray);

  //find first 1
  for (let i = 0; i < fixedPointArray.length; i++) {
    if (fixedPointArray[i] === "1") {
      closestOneIndex = i;
      break;
    }
  }

  console.log("closest one index: " + closestOneIndex);
  console.log("comma index: " + commaIndex);
  const exponent = commaIndex - closestOneIndex;

  //calculate the delta
  let mantissa: string;

  console.log(exponent);

  if (!isNaN(farthestOneIndex)) {
    mantissa = fixedPointArray
      .slice(farthestOneIndex + 1)
      .join("")
      .replace(",", "")
      .replace(".", "");
  } else {
    mantissa = fixedPointArray
      .slice(closestOneIndex + 1)
      .join("")
      .replace(",", "")
      .replace(".", "");
  }

  return {
    delta: exponent,
    mantissa: mantissa,
  };
}
