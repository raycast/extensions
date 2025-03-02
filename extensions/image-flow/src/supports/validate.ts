import { Input } from "../types";
import fs from "fs";

function inputMustBeFilepath(input: Input): string {
  if (input.type == "filepath" && input.value !== "" && fs.existsSync(input.value)) {
    return input.value;
  }

  throw new Error("Input must be a valid filepath");
}

function inputMustBeAURL(input: Input): string {
  if (input.type == "url" && input.value !== "" && input.value.startsWith("http")) {
    return input.value;
  }

  throw new Error("Input must be a valid filepath");
}

function inputMustBeFilepathOrURL(input: Input): string {
  try {
    return inputMustBeFilepath(input);
  } catch (e) {
    try {
      return inputMustBeAURL(input);
    } catch (e) {
      throw new Error("Input must be a valid filepath or URL");
    }
  }
}

export default {
  inputMustBeFilepath,
  inputMustBeAURL,
  inputMustBeFilepathOrURL,
};
