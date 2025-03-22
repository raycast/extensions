function moon_phase() {
  // var synodicMonth = 29.530588853;

  const lunarperiod = 2551442876.899199963; // lunar period in milliseconds
  const orgdate = new Date(1970, 1, 7, 20, 35, 0);
  // orgDate = ; // last full moon in milliseconds

  const dur = Date.now() - Number(orgdate); // time since, in milliseconds

  const phase = 8.0 * (((lunarperiod / 16 + dur) % lunarperiod) / lunarperiod);

  return phase; // get current phase
}

export { moon_phase };
