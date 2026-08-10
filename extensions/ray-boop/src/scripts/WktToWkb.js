/**
  {
    "api":1,
    "name":"Well-Known Text to Binary",
    "description":"Converts your WKT to little endian WKB (hex encoded), wkt2wkb",
    "author":"Mikael Brassman (Twitter: @spoike)",
    "icon":"globe",
    "tags":"wkb,convert,wkt,binary,little endian,hex,wkt2wkb"
  }
**/

const re = /(?:(?:MULTI)?POINT|(?:MULTI)?LINESTRING|(?:MULTI)?POLYGON)\s*\([()0-9\s,.s]+\)/g;

export function main(input) {
  try {
    input.text = input.text.replace(re, convert);
  } catch (err) {
    input.postError(err);
    return;
  }
}

function convert(text) {
  const littleEndian = true;
  let tokens = [];
  for (let i = 0; i < text.length; i++) {
    tokenize(tokens, text[i]);
  }
  tokens = tokens.filter(Boolean);
  let output = "";
  while (tokens.length > 0) {
    const token = tokens.shift();
    if (tokens.shift() !== "(") {
      throw token + "is missing (";
    }
    switch (token) {
      case "POINT":
        output += handlePoint(tokens, littleEndian);
        break;
      case "LINESTRING":
        output += handleLineString(tokens, littleEndian);
        break;
      case "POLYGON":
        output += handlePolygon(getParensSlice(tokens, "POLYGON", false), littleEndian);
        break;
      case "MULTIPOINT":
        output += handleMultipoint(tokens, littleEndian);
        break;
      case "MULTILINESTRING":
        output += handleMultilinestring(tokens, littleEndian);
        break;
      case "MULTIPOLYGON":
        output += handleMultipolygon(tokens, littleEndian);
        break;
      default:
        throw "Unrecognized token " + token;
    }
    if (tokens.shift() !== ")") {
      throw token + " is missing )";
    }
  }
  return output;
}

function tokenize(memo, char) {
  if (memo.length === 0) {
    memo.push(char);
    return;
  }
  if (/[A-Z0-9.-]/.test(char)) {
    memo[memo.length - 1] = memo[memo.length - 1] + char;
  } else if (/[()]/.test(char)) {
    memo.push(char);
    memo.push("");
  } else {
    memo.push("");
  }
}

function handlePoint(arr, littleEndian) {
  let out = toByteOrder(littleEndian) + toUint32(1, littleEndian);
  out += handleDouble(arr.shift(), littleEndian);
  out += handleDouble(arr.shift(), littleEndian);
  return out;
}

function handleLineString(arr, littleEndian) {
  let out = toByteOrder(littleEndian) + toUint32(2, littleEndian);
  const slice = getParensSlice(arr, "LINESTRING", true);
  const pairs = Math.floor(slice.length / 2);
  out += toUint32(pairs, littleEndian);
  for (const token of slice) {
    out += handleDouble(token, littleEndian);
  }
  return out;
}

function handlePolygon(rings, littleEndian) {
  let out = toByteOrder(littleEndian) + toUint32(3, littleEndian);
  out += toUint32(rings.length, littleEndian);
  for (let ring of rings) {
    out += handleRing(ring, littleEndian);
  }
  return out;
}

function handleMultipoint(arr, littleEndian) {
  let out = toByteOrder(littleEndian) + toUint32(4, littleEndian);
  const slice = getParensSlice(arr, "MULTIPOINT", true);
  const pairs = slice.length / 2;
  out += toUint32(pairs, littleEndian);
  for (let i = 0; i < slice.length; i = i + 2) {
    out += toByteOrder(littleEndian);
    out += toUint32(1, littleEndian);
    out += toDouble(slice[i], littleEndian);
    out += toDouble(slice[i + 1], littleEndian);
  }
  return out;
}

function handleMultilinestring(arr, littleEndian) {
  let out = toByteOrder(littleEndian) + toUint32(5, littleEndian);
  const slices = getParensSlice(arr, "MULTILINESTRING", false);
  out += toUint32(slices.length, littleEndian);
  for (let slice of slices) {
    const pairs = Math.floor(slice.length / 2);
    out += toByteOrder(littleEndian) + toUint32(2, littleEndian) + toUint32(pairs, littleEndian);
    for (let token of slice) {
      out += toDouble(token, littleEndian);
    }
  }
  return out;
}

function handleMultipolygon(arr, littleEndian) {
  let out = toByteOrder(littleEndian) + toUint32(6, littleEndian);
  const polygons = getParensSlice(arr, "MULTIPOLYGON", false);
  out += toUint32(polygons.length, littleEndian);
  for (let polygon of polygons) {
    out += handlePolygon(polygon, littleEndian);
  }
  return out;
}

function handleRing(tokens, littleEndian) {
  let out = "";
  const pairs = Math.floor(tokens.length / 2);
  out += toUint32(pairs, littleEndian);
  for (let token of tokens) {
    out += handleDouble(token, littleEndian);
  }
  return out;
}

function getParensSlice(arr, type, flatten) {
  let slices = [];
  while (arr[0] === "(") {
    arr.shift(); // remove (
    const innerSlice = getParensSlice(arr, type, flatten);
    slices.push(flatten ? innerSlice.flat() : innerSlice);
    arr.shift(); // remove )
  }
  let seek = arr.findIndex((token) => /^\)$/.test(token));
  if (seek === -1) {
    throw type + " missing matching )";
  }
  if (seek > 0) {
    slices = slices.concat(arr.splice(0, seek));
  }
  return flatten ? slices.flat() : slices;
}

function handleDouble(token, littleEndian) {
  const number = parseFloat(token);
  if (isNaN(number)) {
    throw token + " is NaN";
  }
  return toDouble(number, littleEndian);
}

function toByteOrder(littleEndian) {
  return littleEndian ? "01" : "00";
}

function toUint32(number, littleEndian) {
  const view = new DataView(new ArrayBuffer(4));
  view.setUint32(0, number, littleEndian);
  return asHex(view, 4);
}

function toDouble(number, littleEndian) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, number, littleEndian);
  return asHex(view, 8);
}

function getHex(i) {
  return ("00" + i.toString(16)).slice(-2);
}

function asHex(view, length) {
  return Array.apply(null, { length })
    .map((_, i) => getHex(view.getUint8(i)))
    .join("");
}
