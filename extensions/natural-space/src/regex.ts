export const regex = {
  of: (raw: string) => createContext(raw),
  rangeOf: (raw: string) =>
    createContext(`[${raw.replace(/(?<!\\)([[\]])/g, '\\$1').replace(/(?<![a-z0-9])-/g, '\\-')}]`),
  rangeOutOf: (raw: string) =>
    createContext(`[^${raw.replace(/(?<!\\)([[\]])/g, '\\$1').replace(/(?<![a-z0-9])-/g, '\\-')}]`),
};

function createContext(initial: string) {
  let buffer = initial;
  const context = {
    before(suffix: string) {
      buffer = `${buffer}(?=${suffix})`;
      return context;
    },
    after(prefix: string) {
      buffer = `(?<=${prefix})${buffer}`;
      return context;
    },
    nextTo(other: string, { allowEdge = true, bothSides = false }: { allowEdge?: boolean; bothSides?: boolean } = {}) {
      const front = `(?<=${allowEdge ? `(^|${other})` : other})`;
      const behind = `(?=${allowEdge ? `(${other}|$)` : other})`;
      buffer = bothSides ? `${front}${buffer}${behind}` : `${buffer}${behind}|${front}${buffer}`;
      return context;
    },
    surroundBy(prefix: string, suffix = prefix) {
      buffer = `${prefix}${buffer}${suffix}`;
      return context;
    },
    between(a: string, b: string) {
      buffer = createContext(a).then(buffer).then(b)._();
      return context;
    },
    repeat(min: 0 | 1 = 0, aggressive = false) {
      buffer = `${buffer}${min === 0 ? `*` : `+`}${aggressive ? '' : '?'}`;
      return context;
    },
    then(other: string) {
      buffer = `${buffer}${other}`;
      return context;
    },
    or(other: string) {
      buffer = `${buffer}|${other}`;
      return context;
    },
    wrap() {
      buffer = `(${buffer})`;
      return context;
    },
    $(flag = 'g') {
      return new RegExp(buffer, flag);
    },
    _() {
      return buffer;
    },
  };
  return context;
}
