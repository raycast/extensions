import { Options } from "../models/alias_options";

export function canCreateNewAlias(options: Options): boolean {
  return options.can_create;
}

export function signedSuffixList(options: Options): string[] {
  return options.suffixes.map((suffix) => suffix.signed_suffix);
}

export function suffixList(options: Options): string[] {
  console.log(options);
  return options.suffixes.map((suffix) => {
    console.log(suffix.suffix);
    return suffix.suffix;
  });
}
