import msToTime from "./ms-to-time";
import getParts from "./get-parts";

export const convertToLightning = (time: Date) => {
  const millisPerCharge = 1318.359375; // 86400000 / 16^4

  const millis =
    1000 * 60 * 60 * time.getHours() +
    1000 * 60 * time.getMinutes() +
    1000 * time.getSeconds() +
    time.getMilliseconds();
  const totalCharges = millis / millisPerCharge;
  const totalSparks = totalCharges / 16;
  const totalZaps = totalSparks / 16;
  const totalBolts = totalZaps / 16;

  const charges = Math.floor(totalCharges) % 16;
  const sparks = Math.floor(totalSparks) % 16;
  const zaps = Math.floor(totalZaps) % 16;
  const bolts = Math.floor(totalBolts) % 16;

  const lightningString =
    bolts.toString(16) +
    "~" +
    zaps.toString(16) +
    "~" +
    sparks.toString(16) +
    (charges > 0 ? "|" + charges.toString(16) : "");
  return {
    lightningString,
    originalTimeString: time.toLocaleTimeString(),
  };
};

export const convertFromLightning = (lightningString: string) => {
  const { bolts, zaps, sparks, charges } = getParts(lightningString);

  let elapsed = (bolts * 16 + zaps) * 16 + sparks;
  if (charges > 0) {
    elapsed = elapsed * 16 + charges;
  }
  const millis = (elapsed * 86400000) / (charges > 0 ? 65536 : 4096);

  return msToTime(millis, lightningString);
};
