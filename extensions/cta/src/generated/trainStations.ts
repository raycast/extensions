// Generated file - do not edit manually
export interface TrainStation {
  id: string;
  name: string;
  lines: string[];
}

export const TRAIN_LINES = [
  { name: "Red", color: "#c60c30" },
  { name: "Blue", color: "#00a1de" },
  { name: "Brown", color: "#62361b" },
  { name: "Green", color: "#009b3a" },
  { name: "Orange", color: "#f9461c" },
  { name: "Pink", color: "#e27ea6" },
  { name: "Purple", color: "#522398" },
  { name: "Yellow", color: "#f9e300" },
] as const;

export interface SearchResult {
  type: "station" | "line";
  stations: TrainStation[];
  line?: string;
}

export function searchTrainStations(query: string): SearchResult {
  const normalizedQuery = query.toLowerCase().trim();

  // 1. Check if it's a station ID
  if (/^\d+$/.test(normalizedQuery)) {
    const station = trainStations.find((s) => s.id === normalizedQuery);
    return station ? { type: "station", stations: [station] } : { type: "station", stations: [] };
  }

  // 2. Check if it's a line color
  const matchingLine = TRAIN_LINES.find((line) => line.name.toLowerCase().includes(normalizedQuery));
  if (matchingLine) {
    const lineStations = trainStations.filter((station) => station.lines.includes(matchingLine.name));
    return {
      type: "line",
      stations: lineStations,
      line: matchingLine.name,
    };
  }

  // 3. Search by station name
  const matchingStations = trainStations.filter((station) => station.name.toLowerCase().includes(normalizedQuery));

  return {
    type: "station",
    stations: matchingStations,
  };
}

export function getLineColor(lineName: string): string {
  return TRAIN_LINES.find((line) => line.name === lineName)?.color || "#000000";
}

export const trainStations: TrainStation[] = [
  {
    id: "40830",
    name: "18th",
    lines: ["Pink"],
  },
  {
    id: "41120",
    name: "35th-Bronzeville-IIT",
    lines: ["Green"],
  },
  {
    id: "40120",
    name: "35th/Archer",
    lines: ["Orange"],
  },
  {
    id: "41270",
    name: "43rd",
    lines: ["Green"],
  },
  {
    id: "41080",
    name: "47th",
    lines: ["Green"],
  },
  {
    id: "41230",
    name: "47th",
    lines: ["Red"],
  },
  {
    id: "40130",
    name: "51st",
    lines: ["Green"],
  },
  {
    id: "40580",
    name: "54th/Cermak",
    lines: ["Pink"],
  },
  {
    id: "40910",
    name: "63rd",
    lines: ["Red"],
  },
  {
    id: "40990",
    name: "69th",
    lines: ["Red"],
  },
  {
    id: "40240",
    name: "79th",
    lines: ["Red"],
  },
  {
    id: "41430",
    name: "87th",
    lines: ["Red"],
  },
  {
    id: "40450",
    name: "95th/Dan Ryan",
    lines: ["Red"],
  },
  {
    id: "40680",
    name: "Adams/Wabash",
    lines: ["Brown", "Green", "Orange", "Pink", "Purple"],
  },
  {
    id: "41240",
    name: "Addison",
    lines: ["Blue"],
  },
  {
    id: "41440",
    name: "Addison",
    lines: ["Brown"],
  },
  {
    id: "41420",
    name: "Addison",
    lines: ["Red"],
  },
  {
    id: "41200",
    name: "Argyle",
    lines: ["Red"],
  },
  {
    id: "40660",
    name: "Armitage",
    lines: ["Brown", "Purple"],
  },
  {
    id: "40170",
    name: "Ashland",
    lines: ["Green", "Pink"],
  },
  {
    id: "41060",
    name: "Ashland",
    lines: ["Orange"],
  },
  {
    id: "40290",
    name: "Ashland/63rd",
    lines: ["Green"],
  },
  {
    id: "40010",
    name: "Austin",
    lines: ["Blue"],
  },
  {
    id: "41260",
    name: "Austin",
    lines: ["Green"],
  },
  {
    id: "40060",
    name: "Belmont",
    lines: ["Blue"],
  },
  {
    id: "41320",
    name: "Belmont",
    lines: ["Brown", "Purple", "Red"],
  },
  {
    id: "41380",
    name: "Bryn Mawr",
    lines: ["Red"],
  },
  {
    id: "40570",
    name: "California",
    lines: ["Blue"],
  },
  {
    id: "41360",
    name: "California",
    lines: ["Green"],
  },
  {
    id: "40440",
    name: "California",
    lines: ["Pink"],
  },
  {
    id: "40280",
    name: "Central",
    lines: ["Green"],
  },
  {
    id: "41250",
    name: "Central",
    lines: ["Purple"],
  },
  {
    id: "40780",
    name: "Central Park",
    lines: ["Pink"],
  },
  {
    id: "41000",
    name: "Cermak-Chinatown",
    lines: ["Red"],
  },
  {
    id: "41690",
    name: "Cermak-McCormick Place",
    lines: ["Green"],
  },
  {
    id: "41410",
    name: "Chicago",
    lines: ["Blue"],
  },
  {
    id: "40710",
    name: "Chicago",
    lines: ["Brown", "Purple"],
  },
  {
    id: "41450",
    name: "Chicago",
    lines: ["Red"],
  },
  {
    id: "40970",
    name: "Cicero",
    lines: ["Blue"],
  },
  {
    id: "40480",
    name: "Cicero",
    lines: ["Green"],
  },
  {
    id: "40420",
    name: "Cicero",
    lines: ["Pink"],
  },
  {
    id: "40630",
    name: "Clark/Division",
    lines: ["Red"],
  },
  {
    id: "40380",
    name: "Clark/Lake",
    lines: ["Blue", "Brown", "Green", "Orange", "Pink", "Purple"],
  },
  {
    id: "40430",
    name: "Clinton",
    lines: ["Blue"],
  },
  {
    id: "41160",
    name: "Clinton",
    lines: ["Green", "Pink"],
  },
  {
    id: "41670",
    name: "Conservatory-Central Park Drive",
    lines: ["Green"],
  },
  {
    id: "40720",
    name: "Cottage Grove",
    lines: ["Green"],
  },
  {
    id: "40230",
    name: "Cumberland",
    lines: ["Blue"],
  },
  {
    id: "40590",
    name: "Damen",
    lines: ["Blue"],
  },
  {
    id: "40090",
    name: "Damen",
    lines: ["Brown"],
  },
  {
    id: "41710",
    name: "Damen",
    lines: ["Green"],
  },
  {
    id: "40210",
    name: "Damen",
    lines: ["Pink"],
  },
  {
    id: "40050",
    name: "Davis",
    lines: ["Purple"],
  },
  {
    id: "40690",
    name: "Dempster",
    lines: ["Purple"],
  },
  {
    id: "40140",
    name: "Dempster-Skokie",
    lines: ["Yellow"],
  },
  {
    id: "40530",
    name: "Diversey",
    lines: ["Brown", "Purple"],
  },
  {
    id: "40320",
    name: "Division",
    lines: ["Blue"],
  },
  {
    id: "40390",
    name: "Forest Park",
    lines: ["Blue"],
  },
  {
    id: "40520",
    name: "Foster",
    lines: ["Purple"],
  },
  {
    id: "40870",
    name: "Francisco",
    lines: ["Brown"],
  },
  {
    id: "41220",
    name: "Fullerton",
    lines: ["Brown", "Purple", "Red"],
  },
  {
    id: "40510",
    name: "Garfield",
    lines: ["Green"],
  },
  {
    id: "41170",
    name: "Garfield",
    lines: ["Red"],
  },
  {
    id: "40490",
    name: "Grand",
    lines: ["Blue"],
  },
  {
    id: "40330",
    name: "Grand",
    lines: ["Red"],
  },
  {
    id: "40760",
    name: "Granville",
    lines: ["Red"],
  },
  {
    id: "40940",
    name: "Halsted",
    lines: ["Green"],
  },
  {
    id: "41130",
    name: "Halsted",
    lines: ["Orange"],
  },
  {
    id: "40980",
    name: "Harlem",
    lines: ["Blue"],
  },
  {
    id: "40750",
    name: "Harlem",
    lines: ["Blue"],
  },
  {
    id: "40020",
    name: "Harlem/Lake",
    lines: ["Green"],
  },
  {
    id: "40850",
    name: "Harold Washington Library-State/Van Buren",
    lines: ["Brown", "Orange", "Pink", "Purple"],
  },
  {
    id: "41490",
    name: "Harrison",
    lines: ["Red"],
  },
  {
    id: "40900",
    name: "Howard",
    lines: ["Purple", "Red", "Yellow"],
  },
  {
    id: "40810",
    name: "Illinois Medical District",
    lines: ["Blue"],
  },
  {
    id: "40300",
    name: "Indiana",
    lines: ["Green"],
  },
  {
    id: "40550",
    name: "Irving Park",
    lines: ["Blue"],
  },
  {
    id: "41460",
    name: "Irving Park",
    lines: ["Brown"],
  },
  {
    id: "40070",
    name: "Jackson",
    lines: ["Blue"],
  },
  {
    id: "40560",
    name: "Jackson",
    lines: ["Red"],
  },
  {
    id: "41190",
    name: "Jarvis",
    lines: ["Red"],
  },
  {
    id: "41280",
    name: "Jefferson Park Transit Center",
    lines: ["Blue"],
  },
  {
    id: "41180",
    name: "Kedzie",
    lines: ["Brown"],
  },
  {
    id: "41070",
    name: "Kedzie",
    lines: ["Green"],
  },
  {
    id: "41150",
    name: "Kedzie",
    lines: ["Orange"],
  },
  {
    id: "41040",
    name: "Kedzie",
    lines: ["Pink"],
  },
  {
    id: "40250",
    name: "Kedzie-Homan",
    lines: ["Blue"],
  },
  {
    id: "41290",
    name: "Kimball",
    lines: ["Brown"],
  },
  {
    id: "41140",
    name: "King Drive",
    lines: ["Green"],
  },
  {
    id: "40600",
    name: "Kostner",
    lines: ["Pink"],
  },
  {
    id: "41660",
    name: "Lake",
    lines: ["Red"],
  },
  {
    id: "40700",
    name: "Laramie",
    lines: ["Green"],
  },
  {
    id: "41340",
    name: "LaSalle",
    lines: ["Blue"],
  },
  {
    id: "40160",
    name: "LaSalle/Van Buren",
    lines: ["Brown", "Orange", "Pink", "Purple"],
  },
  {
    id: "41050",
    name: "Linden",
    lines: ["Purple"],
  },
  {
    id: "41020",
    name: "Logan Square",
    lines: ["Blue"],
  },
  {
    id: "41300",
    name: "Loyola",
    lines: ["Red"],
  },
  {
    id: "40270",
    name: "Main",
    lines: ["Purple"],
  },
  {
    id: "40460",
    name: "Merchandise Mart",
    lines: ["Brown", "Purple"],
  },
  {
    id: "40930",
    name: "Midway",
    lines: ["Orange"],
  },
  {
    id: "40790",
    name: "Monroe",
    lines: ["Blue"],
  },
  {
    id: "41090",
    name: "Monroe",
    lines: ["Red"],
  },
  {
    id: "41330",
    name: "Montrose",
    lines: ["Blue"],
  },
  {
    id: "41500",
    name: "Montrose",
    lines: ["Brown"],
  },
  {
    id: "41510",
    name: "Morgan",
    lines: ["Green", "Pink"],
  },
  {
    id: "40100",
    name: "Morse",
    lines: ["Red"],
  },
  {
    id: "40650",
    name: "North/Clybourn",
    lines: ["Red"],
  },
  {
    id: "40400",
    name: "Noyes",
    lines: ["Purple"],
  },
  {
    id: "40890",
    name: "O'Hare",
    lines: ["Blue"],
  },
  {
    id: "40180",
    name: "Oak Park",
    lines: ["Blue"],
  },
  {
    id: "41350",
    name: "Oak Park",
    lines: ["Green"],
  },
  {
    id: "41680",
    name: "Oakton-Skokie",
    lines: ["Yellow"],
  },
  {
    id: "41310",
    name: "Paulina",
    lines: ["Brown"],
  },
  {
    id: "41030",
    name: "Polk",
    lines: ["Pink"],
  },
  {
    id: "40920",
    name: "Pulaski",
    lines: ["Blue"],
  },
  {
    id: "40030",
    name: "Pulaski",
    lines: ["Green"],
  },
  {
    id: "40960",
    name: "Pulaski",
    lines: ["Orange"],
  },
  {
    id: "40150",
    name: "Pulaski",
    lines: ["Pink"],
  },
  {
    id: "40040",
    name: "Quincy",
    lines: ["Brown", "Orange", "Pink", "Purple"],
  },
  {
    id: "40470",
    name: "Racine",
    lines: ["Blue"],
  },
  {
    id: "40610",
    name: "Ridgeland",
    lines: ["Green"],
  },
  {
    id: "41010",
    name: "Rockwell",
    lines: ["Brown"],
  },
  {
    id: "41400",
    name: "Roosevelt",
    lines: ["Green", "Orange", "Red"],
  },
  {
    id: "40820",
    name: "Rosemont",
    lines: ["Blue"],
  },
  {
    id: "40800",
    name: "Sedgwick",
    lines: ["Brown", "Purple"],
  },
  {
    id: "40080",
    name: "Sheridan",
    lines: ["Red"],
  },
  {
    id: "40840",
    name: "South Boulevard",
    lines: ["Purple"],
  },
  {
    id: "40360",
    name: "Southport",
    lines: ["Brown"],
  },
  {
    id: "40190",
    name: "Sox-35th",
    lines: ["Red"],
  },
  {
    id: "40260",
    name: "State/Lake",
    lines: ["Brown", "Green", "Orange", "Pink", "Purple"],
  },
  {
    id: "40880",
    name: "Thorndale",
    lines: ["Red"],
  },
  {
    id: "40350",
    name: "UIC-Halsted",
    lines: ["Blue"],
  },
  {
    id: "40370",
    name: "Washington",
    lines: ["Blue"],
  },
  {
    id: "41700",
    name: "Washington/Wabash",
    lines: ["Brown", "Green", "Orange", "Pink", "Purple"],
  },
  {
    id: "40730",
    name: "Washington/Wells",
    lines: ["Brown", "Orange", "Pink", "Purple"],
  },
  {
    id: "41210",
    name: "Wellington",
    lines: ["Brown", "Purple"],
  },
  {
    id: "40220",
    name: "Western",
    lines: ["Blue"],
  },
  {
    id: "40670",
    name: "Western",
    lines: ["Blue"],
  },
  {
    id: "41480",
    name: "Western",
    lines: ["Brown"],
  },
  {
    id: "40310",
    name: "Western",
    lines: ["Orange"],
  },
  {
    id: "40740",
    name: "Western",
    lines: ["Pink"],
  },
  {
    id: "40540",
    name: "Wilson",
    lines: ["Purple", "Red"],
  },
];
