export function capitalize([first = "", ...rest]: string) {
  return [first.toUpperCase(), ...rest].join("");
}
