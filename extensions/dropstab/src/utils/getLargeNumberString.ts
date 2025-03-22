export function getLargeNumberString(inp: number) {
  if (isNaN(inp)) {
    return "N/A";
  }

  const largeNumbers = [
    {
      size: 1000000000000,
      longDesc: "trillion",
      shortDesc: "T",
    },
    {
      size: 1000000000,
      longDesc: "billion",
      shortDesc: "B",
    },
    {
      size: 1000000,
      longDesc: "million",
      shortDesc: "M",
    },
    {
      size: 1000,
      longDesc: "thousand",
      shortDesc: "K",
    },
  ];

  for (let i = 0; i < largeNumbers.length; i++) {
    if (inp / largeNumbers[i].size > 1) {
      return `${(inp / largeNumbers[i].size).toFixed(2)} ${largeNumbers[i].shortDesc}`;
    }
  }

  return inp.toFixed(2);
}
