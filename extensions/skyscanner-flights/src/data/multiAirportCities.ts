// Auto-generated list of major cities with multiple airports
// Only major international cities included (45 cities)

export interface MultiAirportCity {
  city: string;
  country: string;
  airports: { iata: string; name: string }[];
  cityCode?: string; // IATA city/metropolitan area code (e.g., 'NYC', 'LON', 'PAR')
}

export const citiesWithMultipleAirports: MultiAirportCity[] = [
  {
    city: "New York",
    country: "United States",
    cityCode: "NYC",
    airports: [
      {
        iata: "LGA",
        name: "La Guardia Airport",
      },
      {
        iata: "JFK",
        name: "John F Kennedy International Airport",
      },
      {
        iata: "JRB",
        name: "Downtown-Manhattan/Wall St Heliport",
      },
      {
        iata: "JRA",
        name: "West 30th St. Heliport",
      },
    ],
  },
  {
    city: "Los Angeles",
    country: "United States",
    cityCode: "LAXA",
    airports: [
      {
        iata: "LAX",
        name: "Los Angeles International Airport",
      },
      {
        iata: "WHP",
        name: "Whiteman Airport",
      },
    ],
  },
  {
    city: "Chicago",
    country: "United States",
    cityCode: "CHI",
    airports: [
      {
        iata: "MDW",
        name: "Chicago Midway International Airport",
      },
      {
        iata: "UGN",
        name: "Waukegan National Airport",
      },
      {
        iata: "ORD",
        name: "Chicago O'Hare International Airport",
      },
      {
        iata: "CGX",
        name: "Chicago Meigs Airport",
      },
    ],
  },
  {
    city: "Houston",
    country: "United States",
    cityCode: "HOUA",
    airports: [
      {
        iata: "IAH",
        name: "George Bush Intercontinental Houston Airport",
      },
      {
        iata: "HOU",
        name: "William P Hobby Airport",
      },
      {
        iata: "EFD",
        name: "Ellington Airport",
      },
      {
        iata: "DWH",
        name: "David Wayne Hooks Memorial Airport",
      },
      {
        iata: "IWS",
        name: "West Houston Airport",
      },
      {
        iata: "AAP",
        name: "Andrau Airpark",
      },
    ],
  },
  {
    city: "Washington",
    country: "United States",
    cityCode: "WAS",
    airports: [
      {
        iata: "DCA",
        name: "Ronald Reagan Washington National Airport",
      },
      {
        iata: "IAD",
        name: "Washington Dulles International Airport",
      },
      {
        iata: "OCW",
        name: "Warren Field",
      },
    ],
  },
  {
    city: "Miami",
    country: "United States",
    cityCode: "MIAA",
    airports: [
      {
        iata: "MIA",
        name: "Miami International Airport",
      },
      {
        iata: "TNT",
        name: "Dade Collier Training and Transition Airport",
      },
      {
        iata: "OPF",
        name: "Opa-locka Executive Airport",
      },
    ],
  },
  {
    city: "Dallas",
    country: "United States",
    cityCode: "DFWA",
    airports: [
      {
        iata: "DAL",
        name: "Dallas Love Field",
      },
      {
        iata: "FWH",
        name: "NAS Fort Worth JRB/Carswell Field",
      },
      {
        iata: "RBD",
        name: "Dallas Executive Airport",
      },
    ],
  },
  {
    city: "Seattle",
    country: "United States",
    cityCode: "SEAA",
    airports: [
      {
        iata: "SEA",
        name: "Seattle Tacoma International Airport",
      },
      {
        iata: "BFI",
        name: "Boeing Field King County International Airport",
      },
    ],
  },
  {
    city: "Atlanta",
    country: "United States",
    cityCode: "ATLA",
    airports: [
      {
        iata: "ATL",
        name: "Hartsfield Jackson Atlanta International Airport",
      },
      {
        iata: "FTY",
        name: "Fulton County Airport Brown Field",
      },
      {
        iata: "PDK",
        name: "DeKalb Peachtree Airport",
      },
    ],
  },
  {
    city: "Las Vegas",
    country: "United States",
    cityCode: "LASA",
    airports: [
      {
        iata: "LAS",
        name: "McCarran International Airport",
      },
      {
        iata: "LVS",
        name: "Las Vegas Municipal Airport",
      },
      {
        iata: "VGT",
        name: "North Las Vegas Airport",
      },
    ],
  },
  {
    city: "Philadelphia",
    country: "United States",
    cityCode: "PHLA",
    airports: [
      {
        iata: "PNE",
        name: "Northeast Philadelphia Airport",
      },
      {
        iata: "PHL",
        name: "Philadelphia International Airport",
      },
      {
        iata: "BBX",
        name: "Wings Field",
      },
    ],
  },
  {
    city: "San Diego",
    country: "United States",
    cityCode: "SANA",
    airports: [
      {
        iata: "NZY",
        name: "North Island Naval Air Station-Halsey Field",
      },
      {
        iata: "SAN",
        name: "San Diego International Airport",
      },
      {
        iata: "SDM",
        name: "Brown Field Municipal Airport",
      },
    ],
  },
  {
    city: "Toronto",
    country: "Canada",
    cityCode: "YTOA",
    airports: [
      {
        iata: "YKZ",
        name: "Buttonville Municipal Airport",
      },
      {
        iata: "YTZ",
        name: "Billy Bishop Toronto City Centre Airport",
      },
      {
        iata: "YYZ",
        name: "Lester B. Pearson International Airport",
      },
      {
        iata: "YZD",
        name: "Downsview Airport",
      },
    ],
  },
  {
    city: "Montreal",
    country: "Canada",
    cityCode: "YMQA",
    airports: [
      {
        iata: "YHU",
        name: "Montréal / Saint-Hubert Airport",
      },
      {
        iata: "YMX",
        name: "Montreal International (Mirabel) Airport",
      },
      {
        iata: "YUL",
        name: "Montreal / Pierre Elliott Trudeau International Airport",
      },
    ],
  },
  {
    city: "Vancouver",
    country: "Canada",
    cityCode: "YVRA",
    airports: [
      {
        iata: "YVR",
        name: "Vancouver International Airport",
      },
      {
        iata: "CXH",
        name: "Vancouver Harbour Water Aerodrome",
      },
    ],
  },
  {
    city: "London",
    country: "United Kingdom",
    cityCode: "LOND",
    airports: [
      {
        iata: "LTN",
        name: "London Luton Airport",
      },
      {
        iata: "LGW",
        name: "London Gatwick Airport",
      },
      {
        iata: "LCY",
        name: "London City Airport",
      },
      {
        iata: "LHR",
        name: "London Heathrow Airport",
      },
      {
        iata: "STN",
        name: "London Stansted Airport",
      },
    ],
  },
  {
    city: "Paris",
    country: "France",
    cityCode: "PAR",
    airports: [
      {
        iata: "LBG",
        name: "Paris-Le Bourget Airport",
      },
      {
        iata: "CDG",
        name: "Charles de Gaulle International Airport",
      },
      {
        iata: "ORY",
        name: "Paris-Orly Airport",
      },
    ],
  },
  {
    city: "Rome",
    country: "Italy",
    cityCode: "ROM",
    airports: [
      {
        iata: "CIA",
        name: "Ciampino–G. B. Pastine International Airport",
      },
      {
        iata: "FCO",
        name: "Leonardo da Vinci–Fiumicino Airport",
      },
    ],
  },
  {
    city: "Stockholm",
    country: "Sweden",
    cityCode: "STO",
    airports: [
      {
        iata: "NYO",
        name: "Stockholm Skavsta Airport",
      },
      {
        iata: "ARN",
        name: "Stockholm-Arlanda Airport",
      },
      {
        iata: "BMA",
        name: "Stockholm-Bromma Airport",
      },
    ],
  },
  {
    city: "Moscow",
    country: "Russia",
    cityCode: "MOW",
    airports: [
      {
        iata: "SVO",
        name: "Sheremetyevo International Airport",
      },
      {
        iata: "VKO",
        name: "Vnukovo International Airport",
      },
      {
        iata: "DME",
        name: "Domodedovo International Airport",
      },
      {
        iata: "BKA",
        name: "Bykovo Airport",
      },
      {
        iata: "OSF",
        name: "Ostafyevo International Airport",
      },
    ],
  },
  {
    city: "Istanbul",
    country: "Turkey",
    cityCode: "ISTA",
    airports: [
      {
        iata: "ISL",
        name: "Atatürk International Airport",
      },
      {
        iata: "SAW",
        name: "Sabiha Gökçen International Airport",
      },
      {
        iata: "IST",
        name: "Istanbul Airport",
      },
    ],
  },
  {
    city: "Tokyo",
    country: "Japan",
    cityCode: "TYO",
    airports: [
      {
        iata: "NRT",
        name: "Narita International Airport",
      },
      {
        iata: "HND",
        name: "Tokyo Haneda International Airport",
      },
    ],
  },
  {
    city: "Beijing",
    country: "China",
    cityCode: "BJS",
    airports: [
      {
        iata: "PEK",
        name: "Beijing Capital International Airport",
      },
      {
        iata: "NAY",
        name: "Beijing Nanyuan Airport",
      },
      {
        iata: "PKX",
        name: "Beijing Daxing International Airport",
      },
    ],
  },
  {
    city: "Shanghai",
    country: "China",
    cityCode: "csha",
    airports: [
      {
        iata: "SHA",
        name: "Shanghai Hongqiao International Airport",
      },
      {
        iata: "PVG",
        name: "Shanghai Pudong International Airport",
      },
    ],
  },
  {
    city: "Singapore",
    country: "Singapore",
    cityCode: "SINS",
    airports: [
      {
        iata: "XSP",
        name: "Seletar Airport",
      },
      {
        iata: "SIN",
        name: "Singapore Changi Airport",
      },
    ],
  },
  {
    city: "Seoul",
    country: "South Korea",
    cityCode: "SEL",
    airports: [
      {
        iata: "GMP",
        name: "Gimpo International Airport",
      },
      {
        iata: "ICN",
        name: "Incheon International Airport",
      },
    ],
  },
  {
    city: "Bangkok",
    country: "Thailand",
    cityCode: "bkkt",
    airports: [
      {
        iata: "DMK",
        name: "Don Mueang International Airport",
      },
      {
        iata: "BKK",
        name: "Suvarnabhumi Airport",
      },
    ],
  },
  {
    city: "Dubai",
    country: "United Arab Emirates",
    cityCode: "DXBA",
    airports: [
      {
        iata: "DXB",
        name: "Dubai International Airport",
      },
      {
        iata: "DWC",
        name: "Al Maktoum International Airport",
      },
    ],
  },
  {
    city: "Osaka",
    country: "Japan",
    cityCode: "OSA",
    airports: [
      {
        iata: "ITM",
        name: "Osaka International Airport",
      },
      {
        iata: "KIX",
        name: "Kansai International Airport",
      },
    ],
  },
  {
    city: "Kuala Lumpur",
    country: "Malaysia",
    cityCode: "KULM",
    airports: [
      {
        iata: "KUL",
        name: "Kuala Lumpur International Airport",
      },
      {
        iata: "SZB",
        name: "Sultan Abdul Aziz Shah International Airport",
      },
    ],
  },
  {
    city: "Melbourne",
    country: "Australia",
    cityCode: "MELA",
    airports: [
      {
        iata: "MEB",
        name: "Melbourne Essendon Airport",
      },
      {
        iata: "MBW",
        name: "Melbourne Moorabbin Airport",
      },
      {
        iata: "MEL",
        name: "Melbourne International Airport",
      },
    ],
  },
  {
    city: "Sao Paulo",
    country: "Brazil",
    cityCode: "SAO",
    airports: [
      {
        iata: "GRU",
        name: "Guarulhos - Governador André Franco Montoro International Airport",
      },
      {
        iata: "CGH",
        name: "Congonhas Airport",
      },
    ],
  },
  {
    city: "Rio De Janeiro",
    country: "Brazil",
    cityCode: "RIO",
    airports: [
      {
        iata: "GIG",
        name: "Rio Galeão – Tom Jobim International Airport",
      },
      {
        iata: "SDU",
        name: "Santos Dumont Airport",
      },
    ],
  },
  {
    city: "Buenos Aires",
    country: "Argentina",
    cityCode: "BUE",
    airports: [
      {
        iata: "AEP",
        name: "Jorge Newbery Airpark",
      },
      {
        iata: "EZE",
        name: "Ministro Pistarini International Airport",
      },
    ],
  },
  {
    city: "Johannesburg",
    country: "South Africa",
    cityCode: "JNBA",
    airports: [
      {
        iata: "GCJ",
        name: "Grand Central Airport",
      },
      {
        iata: "JNB",
        name: "OR Tambo International Airport",
      },
      {
        iata: "HLA",
        name: "Lanseria Airport",
      },
      {
        iata: "QRA",
        name: "Rand Airport",
      },
    ],
  },
];

// Helper function to check if a city has multiple airports
export function hasMultipleAirports(city: string, country: string): boolean {
  return citiesWithMultipleAirports.some(
    (c) => c.city.toLowerCase() === city.toLowerCase() && c.country.toLowerCase() === country.toLowerCase(),
  );
}

// Helper function to get city code for a city
export function getCityCode(city: string, country: string): string | null {
  const found = citiesWithMultipleAirports.find(
    (c) => c.city.toLowerCase() === city.toLowerCase() && c.country.toLowerCase() === country.toLowerCase(),
  );
  return found?.cityCode || null;
}

// Helper function to find city by city code
export function getCityByCode(cityCode: string): MultiAirportCity | null {
  return citiesWithMultipleAirports.find((c) => c.cityCode?.toLowerCase() === cityCode.toLowerCase()) || null;
}
