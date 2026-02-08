import { Transformation } from "./types";
import { uppercase } from "./uppercase";
import { lowercase } from "./lowercase";
import { camelcase } from "./camelcase";
import { pascalcase } from "./pascalcase";
import { snakecase } from "./snakecase";
import { kebabcase } from "./kebabcase";
import { snakeUpperCase } from "./snake-upper-case";
import { capitalizeEachWord } from "./capitalize-each-word";
import { trim } from "./trim";
import { removeExtraSpaces } from "./remove-extra-spaces";
import { removeNonAscii } from "./remove-non-ascii";
import { sortLines } from "./sort-lines";
import { reverseLines } from "./reverse-lines";
import { removeDuplicateLines } from "./remove-duplicate-lines";
import { addLineNumbers } from "./add-line-numbers";
import { urlEncode } from "./url-encode";
import { urlDecode } from "./url-decode";
import { base64Encode } from "./base64-encode";
import { base64Decode } from "./base64-decode";
import { htmlEncode } from "./html-encode";
import { htmlDecode } from "./html-decode";
import { hexEncode } from "./hex-encode";
import { hexDecode } from "./hex-decode";
import { md5 } from "./md5";
import { sha1 } from "./sha1";
import { sha256 } from "./sha256";
import { sha512 } from "./sha512";

export interface TransformationCategory {
  name: string;
  transformations: Transformation[];
}

export const transformationCategories: TransformationCategory[] = [
  {
    name: "Case",
    transformations: [
      uppercase,
      lowercase,
      camelcase,
      pascalcase,
      snakecase,
      kebabcase,
      snakeUpperCase,
      capitalizeEachWord,
    ],
  },
  {
    name: "Text",
    transformations: [trim, removeExtraSpaces, removeNonAscii],
  },
  {
    name: "Lines",
    transformations: [sortLines, reverseLines, removeDuplicateLines, addLineNumbers],
  },
  {
    name: "Encoding",
    transformations: [urlEncode, urlDecode, base64Encode, base64Decode, htmlEncode, htmlDecode, hexEncode, hexDecode],
  },
  {
    name: "Hash",
    transformations: [md5, sha1, sha256, sha512],
  },
];

// Flat array for backwards compatibility
export const transformations: Transformation[] = transformationCategories.flatMap((cat) => cat.transformations);

export type { Transformation } from "./types";
