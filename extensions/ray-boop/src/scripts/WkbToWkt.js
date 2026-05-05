/**
  {
    "api":1,
    "name":"Well-Known Binary to Text",
    "description":"Converts your hex encoded WKB (any endian) to WKB, wkb2wkt",
    "author":"Mikael Brassman (Twitter: @spoike)",
    "icon":"globe",
    "tags":"wkb,convert,wkt,binary,hex,wkb2wkt"
  }
**/

export function main(input) {
  try {
    input.text = input.text.replace(/0[01]0[1-6][0-9a-f]+/g, convertHex);
  } catch (err) {
    input.postError(err);
    return;
  }
}

function convertHex(hexStr) {
  let pos = 0;
  let output = "";
  while (pos < hexStr.length) {
    const littleEndian = getIsLittleEndian(hexStr, pos);
    pos += 2;
    const geoType = getUint32(hexStr, pos, littleEndian);
    pos += 8;
    switch (geoType) {
      case 1: {
        // POINT
        const point = getPoint(hexStr, pos, littleEndian);
        pos += 32;
        output += `POINT (${point})`;
        break;
      }
      case 2: {
        // LINESTRING
        const length = getUint32(hexStr, pos, littleEndian);
        pos += 8;
        const points = [];
        for (let i = 0; i < length; i++) {
          points.push(getPoint(hexStr, pos, littleEndian));
          pos += 32;
        }
        output += `LINESTRING (${points.join(", ")})`;
        break;
      }
      case 3: {
        // POLYGON
        const count = getUint32(hexStr, pos, littleEndian);
        pos += 8;
        const rings = [];
        for (let i = 0; i < count; i++) {
          const length = getUint32(hexStr, pos, littleEndian);
          pos += 8;
          const points = [];
          for (let j = 0; j < length; j++) {
            points.push(getPoint(hexStr, pos, littleEndian));
            pos += 32;
          }
          rings.push(points.join(", "));
        }
        output += `POLYGON (${rings.map(wrapParens).join(", ")})`;
        break;
      }
      case 4: {
        // MULTIPOINT
        const points = [];
        const count = getUint32(hexStr, pos, littleEndian);
        pos += 8;
        for (let i = 0; i < count; i++) {
          const innerLE = getIsLittleEndian(hexStr, pos);
          pos += 2 + 8;
          points.push(getPoint(hexStr, pos, innerLE));
          pos += 32;
        }
        output += `MULTIPOINT (${points.join(", ")})`;
        break;
      }
      case 5: {
        // MULTILINESTRING
        const lineStrings = [];
        const count = getUint32(hexStr, pos, littleEndian);
        pos += 8;
        for (let i = 0; i < count; i++) {
          const innerLE = getIsLittleEndian(hexStr, pos);
          pos += 2 + 8;
          const points = [];
          const length = getUint32(hexStr, pos, littleEndian);
          pos += 8;
          for (let j = 0; j < length; j++) {
            points.push(getPoint(hexStr, pos, innerLE));
            pos += 32;
          }
          lineStrings.push(points.join(", "));
        }
        output += `MULTILINESTRING (${lineStrings.map(wrapParens).join(", ")})`;
        break;
      }
      case 6: {
        // MULTIPOLYGON
        const polys = [];
        const polyCount = getUint32(hexStr, pos, littleEndian);
        pos += 8;
        for (let i = 0; i < polyCount; i++) {
          const innerLE = getIsLittleEndian(hexStr, pos);
          pos += 2 + 8;
          const rings = [];
          const ringCount = getUint32(hexStr, pos, innerLE);
          pos += 8;
          for (let j = 0; j < ringCount; j++) {
            const points = [];
            const pointCount = getUint32(hexStr, pos, innerLE);
            pos += 8;
            for (let k = 0; k < pointCount; k++) {
              points.push(getPoint(hexStr, pos, innerLE));
              pos += 32;
            }
            rings.push(points.join(", "));
          }
          polys.push(rings.map(wrapParens).join(", "));
        }
        output += `MULTIPOLYGON (${polys.map(wrapParens).join(", ")})`;
        break;
      }
      default:
        throw geoType + " is not supported";
    }
  }
  return output;
}

function wrapParens(el) {
  return `(${el})`;
}

function getIsLittleEndian(str, pos) {
  const byteString = str.substr(pos, 2);
  if (byteString === "00") {
    return false;
  } else if (byteString === "01") {
    return true;
  }
  throw byteString + " is unknown byte order";
}

function getPoint(str, pos, littleEndian) {
  const numbers = [];
  numbers.push(getDouble(str, pos, littleEndian));
  numbers.push(getDouble(str, pos + 16, littleEndian));
  return numbers.join(" ");
}

function getUint32(str, pos, littleEndian) {
  const view = new DataView(new ArrayBuffer(4));
  let data = str.substr(pos, 8).match(/../g);
  for (let i = 0; i < data.length; i++) {
    view.setUint8(i, parseInt(data[i], 16));
  }
  return view.getUint32(0, littleEndian);
}

function getDouble(str, pos, littleEndian) {
  const view = new DataView(new ArrayBuffer(8));
  let data = str.substr(pos, 16).match(/../g);
  for (let i = 0; i < data.length; i++) {
    view.setUint8(i, parseInt(data[i], 16));
  }
  return view.getFloat64(0, littleEndian);
}
