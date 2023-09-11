// tc no generator
export const generator = () => {
  const tcno = "" + Math.floor(900000001 * Math.random() + 1e8),
    list = tcno.split("").map(function (t) {
      return parseInt(t, 10);
    }),
    tek = list[0] + list[2] + list[4] + list[6] + list[8],
    cift = list[1] + list[3] + list[5] + list[7],
    tc10 = (7 * tek - cift) % 10;

  return tcno + ("" + tc10) + ("" + ((cift + tek + tc10) % 10));
};
