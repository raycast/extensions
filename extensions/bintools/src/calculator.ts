import React from "react";
import { binFloat, doublePrecFloat, singlePrecFloat, State } from "./index";
import { DoublePrecision, SinglePrecision } from "./Float";

function getSign(number: string) {
  return number.slice(0, 1) == "-" ? "-" : "";
}

function binaryCommaParser(number: string, setState: (value: ((prevState: State) => State) | State) => void) {
  //the input is a binary number with a comma
  //calculate the floating point number in single precision and double precision
  const singlePrecBinFloat = new SinglePrecision(number);
  const doublePrecBinFloat = new DoublePrecision(number);

  //convert the floating point numbers to decimal
  const singlePrecDec = singlePrecBinFloat.getFloatDecimal();
  const doublePrecDec = doublePrecBinFloat.getFloatDecimal();

  //convert the fixed point numbers to decimal
  const fixedPointArray = number.includes(",") ? number.split(",") : number.split(".");
  const fixedPointDec =
    number.slice(0, 1) +
    parseInt(fixedPointArray[0], 2) +
    parseInt(fixedPointArray[1], 2) / 2 ** fixedPointArray[1].length;

  setState({
    inputType: InputType.BinaryComma,
    binNumber: number,
    decNumber: fixedPointDec.toString(),
    hexNumber: "",
    binFloat: {
      singlePrecision: {
        sign: singlePrecBinFloat.getSign().toString(),
        exponent: singlePrecBinFloat.getExponent().toString(),
        mantissa: singlePrecBinFloat.getMantissa().toString(),
        floatingPoint: singlePrecBinFloat.getFloatBinary().toString(),
        floatDecimal: singlePrecDec.toString(),
      } as singlePrecFloat,
      doublePrecision: {
        sign: doublePrecBinFloat.getSign().toString(),
        exponent: doublePrecBinFloat.getExponent().toString(),
        mantissa: doublePrecBinFloat.getMantissa().toString(),
        floatingPoint: doublePrecBinFloat.getFloatBinary().toString(),
        floatDecimal: doublePrecDec.toString(),
      } as doublePrecFloat,
    } as unknown as binFloat,
  });
}

function decimalCommaParser(number: string, setState: (value: ((prevState: State) => State) | State) => void) {
  //convert the decimal comma number to a fixed float binary number
  const fixedPointArray = number.includes(",") ? number.split(",") : number.split(".");
  const fixedPointBinFirstPart = parseInt(fixedPointArray[0]).toString(2);

  let binaryRep = "";
  const demialString = "0." + fixedPointArray[1];
  let decimalRep = parseFloat(demialString);

  for (let i = 0; i < 64 && decimalRep != 0; i++) {
    if (decimalRep >= 1) {
      binaryRep += "1";
      decimalRep--;
    } else {
      binaryRep += "0";
    }
    decimalRep *= 2;
  }

  const fixedPointBin = getSign(number) + fixedPointBinFirstPart + "." + binaryRep.slice(1);

  //calculate the floating point number in single precision and double precision
  const singlePrecBinFloat = new SinglePrecision(fixedPointBin);
  const doublePrecBinFloat = new DoublePrecision(fixedPointBin);

  setState({
    inputType: InputType.DecimalComma,
    binNumber: getSign(number) == "-" ? fixedPointBin.slice(0, 10) : fixedPointBin.slice(0, 9),
    decNumber: number,
    hexNumber: "",
    binFloat: {
      singlePrecision: {
        sign: singlePrecBinFloat.getSign().toString(),
        exponent: singlePrecBinFloat.getExponent().toString(),
        mantissa: singlePrecBinFloat.getMantissa().toString(),
        floatingPoint: singlePrecBinFloat.getFloatBinary().toString(),
        floatDecimal: singlePrecBinFloat.getFloatDecimal(),
      } as singlePrecFloat,
      doublePrecision: {
        sign: doublePrecBinFloat.getSign().toString(),
        exponent: doublePrecBinFloat.getExponent().toString(),
        mantissa: doublePrecBinFloat.getMantissa().toString(),
        floatingPoint: doublePrecBinFloat.getFloatBinary().toString(),
        floatDecimal: doublePrecBinFloat.getFloatDecimal(),
      } as doublePrecFloat,
    } as unknown as binFloat,
  });
}

export function parseInputNumber(number: string, setState: React.Dispatch<React.SetStateAction<State>>) {
  number = number.replaceAll(" ", "");
  console.log(number);
  if (
    number
      .replace("-", "")
      .slice(2)
      .match(/^-?[0-1]+[,.][0-1]+$/) &&
    number.replace("-", "").slice(0, 2) == "0b"
  ) {
    console.log("Binary comma");
    binaryCommaParser(number, setState);
  }
  //check for decimal with comma
  else if (number.match(/^-?[0-9]+[.,][0-9]+$/)) {
    decimalCommaParser(number, setState);
  } else {
    // the input can be as long as we want and can be a mix of different types
    // split the input into an array of numbers and operators
    const numberArray = number.split(/([+*/%^-])/);

    const convertedArray = [];

    for (let i = 0; i < numberArray.length; i++) {
      if (numberArray[i] != "" && !numberArray[i].match(/([+*/%^-])/)) {
        convertedArray.push(convertToDec(numberArray[i]));
      } else {
        convertedArray.push(numberArray[i]);
      }
    }

    console.log(convertedArray);

    //loop through the converted array and calculate the result by using the operator on the numbers
    let result = convertedArray[0] as { number: number; type: InputType };
    const inputs = [result.type];
    for (let i = 1; i < convertedArray.length; i += 2) {
      const operator = convertedArray[i] as string;
      const value = convertedArray[i + 1] as { number: number; type: InputType };
      if (value.number == undefined || result.number == undefined) {
        break;
      }
      inputs.push(operator as InputType);
      switch (operator) {
        case "+":
          result.number += value.number;
          inputs.push(value.type);
          break;
        case "-":
          result.number -= value.number;
          inputs.push(value.type);
          break;
        case "*":
          result.number *= value.number;
          inputs.push(value.type);
          break;
        case "/":
          result.number /= value.number;
          inputs.push(value.type);
          break;
        case "%":
          result.number %= value.number;
          inputs.push(value.type);
          break;
        case "^":
          result.number **= value.number;
          inputs.push(value.type);
          break;
        default:
          break;
      }
    }

    if (result.number == undefined) {
      result = { number: 0, type: InputType.None };
    }

    //convert inputs to string
    setState({
      inputType: inputs.toString().replaceAll(",", " ") ?? "",
      binNumber: result.number.toString(2),
      decNumber: result.number.toString(),
      hexNumber: result.number.toString(16),
      binFloat: undefined,
    });
  }
}

function convertToDec(number: string) {
  const radixTable: any = {
    "0b": { radix: 2, type: InputType.Binary },
    "0x": { radix: 16, type: InputType.Hexadecimal },
    "0o": { radix: 8, type: InputType.Octal },
  };
  let radix = 10;
  let inputType = InputType.Decimal;
  if (number.slice(0, 2) in radixTable) {
    radix = radixTable[number.slice(0, 2)].radix;
    inputType = radixTable[number.slice(0, 2)].type;
    number = number.slice(2);
  }
  return {
    number: parseInt(number, radix),
    type: inputType,
  };
}

export enum InputType {
  None = "",
  Binary = "Binary",
  Decimal = "Decimal",
  Hexadecimal = "Hexadecimal",
  Octal = "Octal",
  BinaryComma = "Binary with comma",
  DecimalComma = "Decimal with comma",
}
