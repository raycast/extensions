const Currency = `
    code,
    symbol,
    name,
    plural,
    exponent
`;
export const OBJECTS = {
  Currency,
  Money: `
        value,
        currency: {
            ${Currency}
        }
    `,
};
