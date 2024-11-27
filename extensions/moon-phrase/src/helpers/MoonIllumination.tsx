/*
Greg Miller gmiller@gregmiller.net 2021
http://www.celestialprogramming.com/
Released as public domain
*/

function JulianDateFromUnixTime(t: number) {
  //Not valid for dates before Oct 15, 1582
  return t / 86400000 + 2440587.5;
}

function constrain(d: number) {
  let t = d % 360;
  if (t < 0) {
    t += 360;
  }
  return t;
}

function getIlluminatedFractionOfMoon(jd: number) {
  const toRad = Math.PI / 180.0;
  const T = (jd - 2451545) / 36525.0;

  const D =
    constrain(
      297.8501921 +
        445267.1114034 * T -
        0.0018819 * T * T +
        (1.0 / 545868.0) * T * T * T -
        (1.0 / 113065000.0) * T * T * T * T
    ) * toRad; //47.2
  const M = constrain(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (1.0 / 24490000.0) * T * T * T) * toRad; //47.3
  const Mp =
    constrain(
      134.9633964 +
        477198.8675055 * T +
        0.0087414 * T * T +
        (1.0 / 69699.0) * T * T * T -
        (1.0 / 14712000.0) * T * T * T * T
    ) * toRad; //47.4

  //48.4
  const i =
    constrain(
      180 -
        (D * 180) / Math.PI -
        6.289 * Math.sin(Mp) +
        2.1 * Math.sin(M) -
        1.274 * Math.sin(2 * D - Mp) -
        0.658 * Math.sin(2 * D) -
        0.214 * Math.sin(2 * Mp) -
        0.11 * Math.sin(D)
    ) * toRad;

  const k = (1 + Math.cos(i)) / 2;
  return k;
}

function getIllumination(unixtime: number) {
  return getIlluminatedFractionOfMoon(JulianDateFromUnixTime(unixtime));
}

export { getIllumination };
