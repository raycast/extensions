import rgbHex from "rgb-hex";
import getParts from "./get-parts";

type Colors = {
  boltColor: string;
  zapColor: string;
  sparkColor: string;
};

const getColors = (lightningString: string): Colors => {
  const { bolts, zaps, sparks, charges } = getParts(lightningString);
  const boltColor = rgbHex(bolts * 16 + zaps, 161, 0);
  const zapColor = rgbHex(50, zaps * 16 + sparks, 214);
  const sparkColor = rgbHex(246, 133, sparks * 16 + charges);

  return {
    boltColor,
    zapColor,
    sparkColor,
  };
};

export default getColors;
