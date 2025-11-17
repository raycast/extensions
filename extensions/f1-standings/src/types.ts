interface DriversResponse {
  MRData: DriversMrdata;
}

interface DriversMrdata {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  DriverTable: DriversDriverTable;
}

interface DriversDriverTable {
  season: string;
  Drivers: Driver[];
}

interface Driver {
  driverId: string;
  permanentNumber: string;
  code: string;
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

interface DriverStandingResponse {
  MRData: DriverStandingResponseMrdata;
}

interface DriverStandingResponseMrdata {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  StandingsTable: DriverStandingStandingsTable;
}

interface DriverStandingStandingsTable {
  season: string;
  round: string;
  StandingsLists: DriverStandingStandingsList[];
}

interface DriverStandingStandingsList {
  season: string;
  round: string;
  DriverStandings: DriverStanding[];
}

interface DriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

interface ConstructorStandingResponse {
  MRData: ConstructorStandingResponseMrdata;
}

interface ConstructorStandingResponseMrdata {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  StandingsTable: ConstructorStandingStandingsTable;
}

interface ConstructorStandingStandingsTable {
  season: string;
  round: string;
  StandingsLists: ConstructorStandingStandingsList[];
}

interface ConstructorStandingStandingsList {
  season: string;
  round: string;
  ConstructorStandings: ConstructorStanding[];
}

interface ConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: Constructor;
}

interface ConstructorsResponse {
  MRData: ConstructorsMrdata;
}

interface ConstructorsMrdata {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  ConstructorTable: ConstructorsConstructorTable;
}

interface ConstructorsConstructorTable {
  season: string;
  Constructors: Constructor[];
}

interface Constructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

interface ScheduleResponse {
  MRData: ScheduleMrdata;
}

interface ScheduleMrdata {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  RaceTable: ScheduleRaceTable;
}

interface ScheduleRaceTable {
  season: string;
  Races: Race[];
}

interface Race {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    url: string;
    Location: {
      lat: string;
      long: string;
      locality: string;
      country: string;
    };
  };
  date: string;
  time: string;
  FirstPractice?: {
    date: string;
    time: string;
  };
  SecondPractice?: {
    date: string;
    time: string;
  };
  ThirdPractice?: {
    date: string;
    time: string;
  };
  Qualifying?: {
    date: string;
    time: string;
  };
  Sprint?: {
    date: string;
    time: string;
  };
  SprintQualifying?: {
    date: string;
    time: string;
  };
}

interface RaceResultItem {
  number: string;
  position: string;
  points: string;
  Driver: {
    driverId: string;
    permanentNumber: string;
    code: string;
    url: string;
    givenName: string;
    familyName: string;
    dateOfBirth: string;
    nationality: string;
  };
  Constructor: Constructor;
  grid: number;
  status: string;
  FastestLap?: {
    rank: string;
    lap: string;
  };
}

interface ResultResponse {
  MRData: ResultResponseMrdata;
}

interface ResultResponseMrdata {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  RaceTable: ResultResponseRaceTable;
}

interface ResultResponseRaceTable {
  season: string;
  Races: RaceResult[];
}

interface RaceResult extends Race {
  Results: RaceResultItem[];
}

interface QualifyingResultResponse {
  MRData: QualifyingResultMrdata;
}

interface QualifyingResultMrdata {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  RaceTable: QualifyingResultRaceTable;
}

interface QualifyingResultRaceTable {
  season: string;
  Races: QualifyingResult[];
}

interface QualifyingResult extends Race {
  QualifyingResults: QualifyingResultItem[];
}

interface QualifyingResultItem {
  number: string;
  position: string;
  Driver: Driver;
  Constructor: Constructor;
  Q1: string;
  Q2?: string;
  Q3?: string;
}

interface SeasonResponse {
  MRData: SeasonMrdata;
}

interface SeasonMrdata {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  SeasonTable: SeasonSeasonTable;
}

interface SeasonSeasonTable {
  Seasons: Season[];
}

interface Season {
  season: number;
  url: string;
}

export type {
  DriversResponse,
  DriversMrdata,
  DriversDriverTable,
  Driver,
  ConstructorsResponse,
  ConstructorsMrdata,
  ConstructorsConstructorTable,
  Constructor,
  DriverStandingResponse,
  DriverStandingResponseMrdata,
  DriverStandingStandingsTable,
  DriverStandingStandingsList,
  DriverStanding,
  ConstructorStandingResponse,
  ConstructorStandingResponseMrdata,
  ConstructorStandingStandingsTable,
  ConstructorStandingStandingsList,
  ConstructorStanding,
  ResultResponse,
  ResultResponseMrdata,
  ResultResponseRaceTable,
  RaceResult,
  RaceResultItem,
  QualifyingResultResponse,
  QualifyingResultMrdata,
  QualifyingResultRaceTable,
  QualifyingResult,
  QualifyingResultItem,
  ScheduleResponse,
  ScheduleMrdata,
  ScheduleRaceTable,
  Race,
  SeasonResponse,
  SeasonMrdata,
  SeasonSeasonTable,
  Season,
};
