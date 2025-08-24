export const ASIA = [
  // East Asia
  { displayName: "Tokyo", timezone: "Asia/Tokyo" },
  { displayName: "Yokohama", timezone: "Asia/Tokyo" },
  { displayName: "Osaka", timezone: "Asia/Tokyo" },
  { displayName: "Nagoya", timezone: "Asia/Tokyo" },
  { displayName: "Sapporo", timezone: "Asia/Tokyo" },
  { displayName: "Seoul", timezone: "Asia/Seoul" },
  { displayName: "Busan", timezone: "Asia/Seoul" },
  { displayName: "Incheon", timezone: "Asia/Seoul" },
  { displayName: "Shanghai", timezone: "Asia/Shanghai" },
  { displayName: "Beijing", timezone: "Asia/Shanghai" },
  { displayName: "Guangzhou", timezone: "Asia/Shanghai" },
  { displayName: "Shenzhen", timezone: "Asia/Shanghai" },
  { displayName: "Chengdu", timezone: "Asia/Shanghai" },
  { displayName: "Hong Kong", timezone: "Asia/Hong_Kong" },
  { displayName: "Taipei", timezone: "Asia/Taipei" },
  { displayName: "Kaohsiung", timezone: "Asia/Taipei" },
  { displayName: "Ulaanbaatar", timezone: "Asia/Ulaanbaatar" },

  // Southeast Asia
  { displayName: "Jakarta", timezone: "Asia/Jakarta" },
  { displayName: "Surabaya", timezone: "Asia/Jakarta" },
  { displayName: "Bandung", timezone: "Asia/Jakarta" },
  { displayName: "Singapore", timezone: "Asia/Singapore" },
  { displayName: "Bangkok", timezone: "Asia/Bangkok" },
  { displayName: "Manila", timezone: "Asia/Manila" },
  { displayName: "Quezon City", timezone: "Asia/Manila" },
  { displayName: "Ho Chi Minh City", timezone: "Asia/Ho_Chi_Minh" },
  { displayName: "Hanoi", timezone: "Asia/Bangkok" },
  { displayName: "Yangon", timezone: "Asia/Yangon" },
  { displayName: "Kuala Lumpur", timezone: "Asia/Kuala_Lumpur" },
  { displayName: "Phnom Penh", timezone: "Asia/Phnom_Penh" },
  { displayName: "Vientiane", timezone: "Asia/Vientiane" },
  { displayName: "Bandar Seri Begawan", timezone: "Asia/Brunei" },
  { displayName: "Dili", timezone: "Asia/Dili" },

  // South Asia
  { displayName: "Delhi", timezone: "Asia/Kolkata" },
  { displayName: "Mumbai", timezone: "Asia/Kolkata" },
  { displayName: "Bangalore", timezone: "Asia/Kolkata" },
  { displayName: "Kolkata", timezone: "Asia/Kolkata" },
  { displayName: "Chennai", timezone: "Asia/Kolkata" },
  { displayName: "Dhaka", timezone: "Asia/Dhaka" },
  { displayName: "Karachi", timezone: "Asia/Karachi" },
  { displayName: "Lahore", timezone: "Asia/Karachi" },
  { displayName: "Islamabad", timezone: "Asia/Karachi" },
  { displayName: "Colombo", timezone: "Asia/Colombo" },
  { displayName: "Kathmandu", timezone: "Asia/Kathmandu" },
  { displayName: "Thimphu", timezone: "Asia/Thimphu" },
  { displayName: "Male", timezone: "Indian/Maldives" },

  // Central Asia
  { displayName: "Almaty", timezone: "Asia/Almaty" },
  { displayName: "Nur-Sultan", timezone: "Asia/Almaty" },
  { displayName: "Tashkent", timezone: "Asia/Tashkent" },
  { displayName: "Bishkek", timezone: "Asia/Bishkek" },
  { displayName: "Dushanbe", timezone: "Asia/Dushanbe" },
  { displayName: "Ashgabat", timezone: "Asia/Ashgabat" },

  // West Asia
  { displayName: "Dubai", timezone: "Asia/Dubai" },
  { displayName: "Abu Dhabi", timezone: "Asia/Dubai" },
  { displayName: "Riyadh", timezone: "Asia/Riyadh" },
  { displayName: "Jeddah", timezone: "Asia/Riyadh" },
  { displayName: "Tehran", timezone: "Asia/Tehran" },
  { displayName: "Baghdad", timezone: "Asia/Baghdad" },
  { displayName: "Ankara", timezone: "Europe/Istanbul" },
  { displayName: "Jerusalem", timezone: "Asia/Jerusalem" },
  { displayName: "Tel Aviv", timezone: "Asia/Jerusalem" },
  { displayName: "Amman", timezone: "Asia/Amman" },
  { displayName: "Beirut", timezone: "Asia/Beirut" },
  { displayName: "Kuwait City", timezone: "Asia/Kuwait" },
  { displayName: "Doha", timezone: "Asia/Qatar" },
  { displayName: "Manama", timezone: "Asia/Bahrain" },
  { displayName: "Muscat", timezone: "Asia/Muscat" },
  { displayName: "Sana'a", timezone: "Asia/Aden" },
  { displayName: "Damascus", timezone: "Asia/Damascus" },
];

// Additional timezone aliases for Asia and Oceania
export const ASIA_OCEANIA_ALIASES = new Map([
  // Australia/New Zealand
  ["SYD", "Australia/Sydney"],
  ["MEL", "Australia/Melbourne"],
  ["BNE", "Australia/Brisbane"],
  ["PER", "Australia/Perth"],
  ["ADL", "Australia/Adelaide"],
  ["AKL", "Pacific/Auckland"],
  ["WLG", "Pacific/Auckland"],
  ["CHC", "Pacific/Auckland"],

  // East Asia
  ["HND", "Asia/Tokyo"],
  ["NRT", "Asia/Tokyo"],
  ["ICN", "Asia/Seoul"],
  ["PVG", "Asia/Shanghai"],
  ["PEK", "Asia/Shanghai"],
  ["HKG", "Asia/Hong_Kong"],
  ["TPE", "Asia/Taipei"],

  // Southeast Asia
  ["SIN", "Asia/Singapore"],
  ["BKK", "Asia/Bangkok"],
  ["MNL", "Asia/Manila"],
  ["SGN", "Asia/Ho_Chi_Minh"],
  ["HAN", "Asia/Bangkok"],
  ["KUL", "Asia/Kuala_Lumpur"],
  ["CGK", "Asia/Jakarta"],

  // South Asia
  ["DEL", "Asia/Kolkata"],
  ["BOM", "Asia/Kolkata"],
  ["MAA", "Asia/Kolkata"],
  ["DAC", "Asia/Dhaka"],
  ["KHI", "Asia/Karachi"],
  ["ISB", "Asia/Karachi"],
  ["CMB", "Asia/Colombo"],

  // West Asia
  ["DXB", "Asia/Dubai"],
  ["AUH", "Asia/Dubai"],
  ["RUH", "Asia/Riyadh"],
  ["JED", "Asia/Riyadh"],
  ["IKA", "Asia/Tehran"],
  ["BGW", "Asia/Baghdad"],
  ["IST", "Europe/Istanbul"],
  ["TLV", "Asia/Jerusalem"],
]);

// Regional timezone abbreviations
export const REGIONAL_TIMEZONE_ABBREVIATIONS = new Map([
  // Australia
  ["AEST", "Australia/Sydney"], // Australian Eastern Standard Time
  ["AEDT", "Australia/Sydney"], // Australian Eastern Daylight Time
  ["ACST", "Australia/Adelaide"], // Australian Central Standard Time
  ["ACDT", "Australia/Adelaide"], // Australian Central Daylight Time
  ["AWST", "Australia/Perth"], // Australian Western Standard Time

  // Asia
  ["JST", "Asia/Tokyo"], // Japan Standard Time
  ["KST", "Asia/Seoul"], // Korea Standard Time
  ["CST", "Asia/Shanghai"], // China Standard Time
  ["HKT", "Asia/Hong_Kong"], // Hong Kong Time
  ["SGT", "Asia/Singapore"], // Singapore Time
  ["ICT", "Asia/Bangkok"], // Indochina Time
  ["IST", "Asia/Kolkata"], // India Standard Time
  ["PKT", "Asia/Karachi"], // Pakistan Standard Time
  ["GST", "Asia/Dubai"], // Gulf Standard Time
  ["MSK", "Europe/Moscow"], // Moscow Standard Time
]);
