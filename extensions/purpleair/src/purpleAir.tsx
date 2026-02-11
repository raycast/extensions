// Helper functions and interfaces for AQI calculations and sensor data

export interface AQIReport {
  Number: number;
  Description: string;
  LongDescription: string;
}

// AQI calculation functions
function aqiFromPM(pm: number, humidity: number): AQIReport {
  const r: AQIReport = {
    Number: 0,
    Description: "",
    LongDescription: "",
  };

  // if (isNaN(pm)) return r
  // if (pm == undefined) return r;
  // if (pm < 0) return pm;
  // if (pm > 1000) return "-";
  /*                                  AQI         RAW PM2.5
    Good                               0 - 50   |   0.0 – 12.0
    Moderate                          51 - 100  |  12.1 – 35.4
    Unhealthy for Sensitive Groups   101 – 150  |  35.5 – 55.4
    Unhealthy                        151 – 200  |  55.5 – 150.4
    Very Unhealthy                   201 – 300  |  150.5 – 250.4
    Hazardous                        301 – 400  |  250.5 – 350.4
    Hazardous                        401 – 500  |  350.5 – 500.4
    */

  // we need to adjust the pm2.5 value per the EPA update
  // https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=353088&Lab=CEMM

  pm = calculateEPAValue(pm, humidity);

  if (pm > 350.5) {
    r.Number = calcAQI(pm, 500, 401, 500.4, 350.5);
    r.Description = "⚫ Hazardous";
    r.LongDescription =
      ">300: Health warning of emergency conditions: everyone is more likely to be affected with 24 hours of exposure.";
  } else if (pm > 250.5) {
    r.Number = calcAQI(pm, 400, 301, 350.4, 250.5);
    r.Description = "💀 Hazardous";
    r.LongDescription =
      ">300: Health warning of emergency conditions: everyone is more likely to be affected with 24 hours of exposure.";
  } else if (pm > 150.5) {
    r.Number = calcAQI(pm, 300, 201, 250.4, 150.5);
    r.Description = "🟤 Very Unhealthy";
    r.LongDescription =
      "201-300: Health alert: The risk of health effects is increased for everyone with 24 hours of exposure.";
  } else if (pm > 55.5) {
    r.Number = calcAQI(pm, 200, 151, 150.4, 55.5);
    r.Description = "🔴 Unhealthy";
    r.LongDescription =
      "151-200: Some members of the general public may experience health effects with 24 hours of exposure; members of sensitive groups may experience more serious health effects.";
  } else if (pm > 35.5) {
    r.Number = calcAQI(pm, 150, 101, 55.4, 35.5);
    r.Description = "🟠 Unhealthy for Sensitive Groups";
    r.LongDescription =
      "101-150: Members of sensitive groups may experience health effects with 24 hours of exposure. The general public is less likely to be affected.";
  } else if (pm > 12.1) {
    r.Number = calcAQI(pm, 100, 51, 35.4, 12.1);
    r.Description = "🟡 Moderate";
    r.LongDescription =
      "51-100: Air quality is acceptable. However, there may be a risk for some people with 24 hours of exposure, particularly those who are unusually sensitive to air pollution.";
  } else if (pm >= 0) {
    r.Number = calcAQI(pm, 50, 0, 12, 0);
    r.Description = "🟢 Good";
    r.LongDescription =
      "0-50: Air quality is satisfactory, and air pollution poses little or no risk with 24 hours of exposure.";
  } else {
    r.Number = 0;
    r.Description = "undefined";
  }
  return r;
}

function calcAQI(Cp: number, Ih: number, Il: number, BPh: number, BPl: number) {
  const a = Ih - Il;
  const b = BPh - BPl;
  const c = Cp - BPl;
  return Math.round((a / b) * c + Il);
}

function calculateEPAValue(pm2_5_atm: number, RH: number): number {
  if (pm2_5_atm >= 0 && pm2_5_atm < 30) {
    return 0.524 * pm2_5_atm - 0.0862 * RH + 5.75;
  } else if (pm2_5_atm >= 30 && pm2_5_atm < 50) {
    return (0.786 * (pm2_5_atm / 20 - 3 / 2) + 0.524 * (1 - (pm2_5_atm / 20 - 3 / 2))) * pm2_5_atm - 0.0862 * RH + 5.75;
  } else if (pm2_5_atm >= 50 && pm2_5_atm < 210) {
    return 0.786 * pm2_5_atm - 0.0862 * RH + 5.75;
  } else if (pm2_5_atm >= 210 && pm2_5_atm < 260) {
    return (
      (0.69 * (pm2_5_atm / 50 - 21 / 5) + 0.786 * (1 - (pm2_5_atm / 50 - 21 / 5))) * pm2_5_atm -
      0.0862 * RH * (1 - (pm2_5_atm / 50 - 21 / 5)) +
      2.966 * (pm2_5_atm / 50 - 21 / 5) +
      5.75 * (1 - (pm2_5_atm / 50 - 21 / 5)) +
      8.84 * Math.pow(10, -4) * Math.pow(pm2_5_atm, 2) * (pm2_5_atm / 50 - 21 / 5)
    );
  } else if (pm2_5_atm >= 260) {
    return 2.966 + 0.69 * pm2_5_atm + 8.84 * Math.pow(10, -4) * Math.pow(pm2_5_atm, 2);
  }

  // Default return statement
  return pm2_5_atm;
}

export { aqiFromPM };
