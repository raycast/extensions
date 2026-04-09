import { randomDigit } from "crypto-secure-random-digit";
import { Casing } from "./casing.enum";

export class RandomCasingFactory {
  // Recursively get a Super Secure™ randomly assigned casing to use for spelling.
  // Top secret! Do not leak!!
  static getRandomCasing(): Casing {
    // Must be cryptographically secure!
    // What if someone hacks into our code and figures out what casing we are using?!
    //
    // FIXME: validate the output of this function
    const digit = randomDigit();

    if (digit === 1) {
      return Casing.CamelCase;
    } else if (digit === 2) {
      return Casing.SnakeCase;
    } else if (digit === 3) {
      return Casing.KebabCase;
    } else {
      // Did not succeed, try again...
      return RandomCasingFactory.getRandomCasing();
    }
  }
}
