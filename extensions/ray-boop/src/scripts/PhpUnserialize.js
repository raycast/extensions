/**
  {
    "api":1,
    "name":"PHP Unserialize",
    "description":"Convert PHP serialized data to JSON",
    "author":"Rob Bogie",
    "icon":"elephant",
    "tags":"php,serialize,unserialize,json"
  }
**/

export function main(state) {
  try {
    const input = state.text;
    const unserialized = unserialize(input);
    const data = unserialized[0];

    if (unserialized[1] != input.length) {
      throw new Error("Invalid serialized string");
    }

    if (data === null || data === undefined) {
      state.text = null;
    } else if (typeof data === "object") {
      state.text = JSON.stringify(data, null, 2);
    } else {
      state.text = data.toString();
    }
  } catch (e) {
    state.postError(e.message);
  }
}

function decodeInt(text, startPos) {
  const lastChar = text.indexOf(";", startPos);
  if (lastChar <= 0) {
    throw new Error("decodeInt: unexpected end of string");
  }
  return [Number.parseInt(text.slice(startPos, lastChar)), lastChar + 1];
}

function decodeBool(text, startPos) {
  const lastChar = text.indexOf(";", startPos);
  if (lastChar != startPos + 1) {
    throw new Error("decodeBool: unexpected data length");
  }
  switch (text.charAt(startPos)) {
    case "0":
      return [false, startPos + 2];
    case "1":
      return [true, startPos + 2];
    default:
      throw new Error("decodeBool: found unexpected data");
  }
}

function decodeFloat(text, startPos) {
  const lastChar = text.indexOf(";", startPos);
  if (lastChar <= 0) {
    throw new Error("decodeFloat: unexpected end of string");
  }
  return [Number.parseFloat(text.slice(startPos, lastChar)), lastChar + 1];
}

function decodeString(text, startPos) {
  const lengthEnd = text.indexOf(":", startPos);
  if (lengthEnd <= 0) {
    throw new Error("decodeString: no string length found");
  }
  const byteLength = Number.parseInt(text.slice(startPos, lengthEnd));

  startPos = lengthEnd + 2;
  let currentStrLength = 0;
  let numBytes = 0;
  while (currentStrLength + startPos < text.length && numBytes < byteLength) {
    const nextPos = text.indexOf('";', startPos + currentStrLength + 1) - startPos;
    if (nextPos > currentStrLength) {
      currentStrLength = nextPos;
    } else {
      // No end will be found anymore, exit and do our safety checks as if we reached the end
      break;
    }

    const subStr = text.slice(startPos, startPos + currentStrLength);
    try {
      const encodedStr = encodeURI(subStr);
      numBytes = encodedStr.split(/%..|./).length - 1;
    } catch {
      // encodeURI will fail when an invalid UTF16 character is found, which happens with 4 byte characters (e.g. emoji)
      // We will simply try again on the next position
    }
  }

  if (numBytes != byteLength) {
    throw new Error("Could not decode string: field length mismatch");
  }

  return [text.slice(startPos, startPos + currentStrLength), startPos + currentStrLength + 2];
}

function decodeArray(text, startPos) {
  const lengthEnd = text.indexOf(":", startPos);
  if (lengthEnd <= 0) {
    throw new Error("decodeArray: no arraylength found");
  }
  const numItems = Number.parseInt(text.slice(startPos, lengthEnd));
  let data = {};
  startPos = lengthEnd + 2;
  let continuous = true;
  for (let i = 0; i < numItems; i++) {
    const keyData = unserialize(text, startPos);
    const valueData = unserialize(text, keyData[1]);
    startPos = valueData[1];

    if (keyData[0] !== i) {
      continuous = false;
    }

    data[keyData[0]] = valueData[0];
  }

  if (continuous) {
    // Convert non key-value maps to array
    const array = new Array(numItems);
    for (let i = 0; i < numItems; i++) {
      array[i] = data[i];
    }
    data = array;
  }
  return [data, startPos + 1];
}

function decodeObject(text, startPos) {
  const classNameLengthEnd = text.indexOf(":", startPos);
  if (classNameLengthEnd <= 0) {
    throw new Error("decodeObject: no arraylength found");
  }
  const classNameLength = Number.parseInt(text.slice(startPos, classNameLengthEnd));
  startPos = classNameLengthEnd + 2;
  if (classNameLength !== 8 || text.slice(startPos, startPos + 8) !== "stdClass") {
    throw new Error("decodeObject: object type not supported");
  }

  startPos += 10;

  return decodeArray(text, startPos);
}

function unserialize(text, startPos = 0) {
  const type = text[startPos];
  switch (type) {
    case "i":
      return decodeInt(text, startPos + 2);
    case "b":
      return decodeBool(text, startPos + 2);
    case "N":
      return [null, startPos + 2];
    case "d":
      return decodeFloat(text, startPos + 2);
    case "s":
      return decodeString(text, startPos + 2);
    case "a":
      return decodeArray(text, startPos + 2);
    case "O":
      return decodeObject(text, startPos + 2);
    default:
      throw new Error("unknown type found: " + type + " at " + startPos);
  }
}
