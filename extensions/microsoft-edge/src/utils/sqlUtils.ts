export const termsAsParamNames = (terms: string[]): string[] => {
  const p = [];
  for (let i = 0; i < terms.length; i++) {
    p.push(`@t_${i}`);
  }
  return p;
};

export const termsAsParams = (terms: string[]) => {
  return termsAsParamNames(terms).reduce((all: { [key: string]: string }, t, i) => {
    all[t] = `%${terms[i]}%`;
    return all;
  }, {});
};
