const getParts = (lightningString: string) => {
  const lightningParts = lightningString.split("~");
  const bolts = parseInt(lightningParts[0], 16);
  const zaps = parseInt(lightningParts[1], 16);
  const sparks = parseInt(lightningString.includes("|") ? lightningParts[2].split("|")[0] : lightningParts[2], 16);
  const charges = parseInt(lightningParts[2].split("|")[1]?.substring(0, 1), 16) || 0;

  return {
    bolts,
    zaps,
    sparks,
    charges,
  };
};

export default getParts;
