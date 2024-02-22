export function getColorHexCode(value: number) {
  const ranges = [
    { min: 0, max: 1199, color: "#CCCCCC" },
    { min: 1200, max: 1399, color: "#9BFC87" },
    { min: 1400, max: 1599, color: "#90DBBD" },
    { min: 1600, max: 1899, color: "#AAAAF9" },
    { min: 1900, max: 2099, color: "#EF8EF9" },
    { min: 2100, max: 2299, color: "#F7CE91" },
    { min: 2300, max: 2399, color: "#F5BE67" },
    { min: 2400, max: 2599, color: "#EE7F7B" },
    { min: 2600, max: 2999, color: "#EB483F" },
  ];

  const range = ranges.find(({ min, max }) => value >= min && value <= max);
  return range ? range.color : "#9C1F14";
}
