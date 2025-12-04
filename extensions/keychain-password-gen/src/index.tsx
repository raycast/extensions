import { showHUD, Clipboard } from "@raycast/api";
import { randomInt } from "crypto";

export default async function Command() {
  const pass = generate();
  await Clipboard.copy(pass, { transient: true });
  await Clipboard.paste(pass);

  await showHUD("Password copied (and pasted) ✅");
}

function generate() {
  const lowerConsonants = "bcdfghjkmnpqrstvwxz".split("");
  const upperConsonants = "BCDFGHJKLMNPQRSTVWXZ".split("");
  const lowerVowels = "aeiouy".split("");
  const upperVowels = "AEUY".split("");

  const numberPositions: { [index: number]: number } = {
    1: 1,
    2: 7,
    3: 13,
    4: 6,
    5: 12,
    6: 18,
  };

  // choose position of number and upper case letter
  const numPosKey = randomInt(2, 7);
  const NumberPosition = numberPositions[numPosKey];

  let uppercasePos = randomInt(1, 19);
  if (uppercasePos === numPosKey) {
    const rnd = randomInt(1, 10);

    if (uppercasePos > 9) {
      uppercasePos -= rnd;
    } else {
      uppercasePos += rnd;
    }
  }

  // pick characters
  let count = 1;
  let passwordSection = "";
  for (let i = 1; i <= 18; i++) {
    count += 1;

    if (NumberPosition === i) {
      if (NumberPosition < 4) {
        count -= 1;
      }
      passwordSection += randomInt(1, 10);
    } else {
      if (count % 3 === 0) {
        // vowel
        if (uppercasePos === i) {
          passwordSection += randomFromArray(upperVowels);
        } else {
          passwordSection += randomFromArray(lowerVowels);
        }
      } else {
        // consonant
        if (uppercasePos === i) {
          passwordSection += randomFromArray(upperConsonants);
        } else {
          passwordSection += randomFromArray(lowerConsonants);
        }
      }
    }

    // separate characters into sections
    if (i !== 18 && i % 6 === 0) {
      passwordSection += "-";
    }
  }

  return passwordSection;
}

function randomFromArray(array: any[]) {
  return array[randomInt(1, array.length)];
}
