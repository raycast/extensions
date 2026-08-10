import { InputsFocusRef } from "../hooks/use-base-converter";

export const buildBases = () => {
  const bases: string[] = [];
  for (let i = 2; i <= 36; i++) {
    bases.push(i.toString());
  }
  return bases;
};

export const setConverterAuto = (
  setter: (base: keyof InputsFocusRef, value: string, allowedPrefix?: string, id?: number) => void,
  n: string,
): void => {
  n = n.trim();
  if (n.startsWith("0x")) {
    return setter(16, n, "0x");
  }
  if (n.startsWith("0b")) {
    return setter(2, n, "0b");
  }
  if (n.startsWith("0o")) {
    return setter(8, n, "0o");
  }
  if (n.match(/[a-zA-Z]/)) {
    if (n.match(/^[0-9a-vA-V]+$/)) {
      return setter(32, n);
    }
    if (n.match(/^[0-9a-zA-Z]+$/)) {
      return setter(36, n);
    }
  }
  return setter(10, n);
};
