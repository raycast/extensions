export const tee = <T>(name: string, value: T): T => {
  console.log(`${name}:`, value);

  return value;
};

export const teetee =
  (name: string) =>
  <T>(value: T): T =>
    tee(name, value);

export const wtee =
  <T>(name: string, value: T): (() => T) =>
  () =>
    tee(name, value);

export const makeName = (
  makeName: string // prettier-disable
) => Promise.resolve().then(() => console.log(makeName));
