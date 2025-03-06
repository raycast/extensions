export interface Region {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: null | Date;
  Country: string;
  CountryISO: string;
  Currency: string;
  Plans: Plan[];
  Rank: number;
}

export interface Plan {
  ID: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  DeletedAt: null | Date;
  PricingID: number;
  Name: PlanName;
  Price: string;
  PriceInCNY: number;
}

export enum PlanName {
  The50GB = "50GB",
  The200GB = "200GB",
  The2TB = "2TB",
  The6TB = "6TB",
  The12TB = "12TB",
}

export interface PlanType {
  id: string;
  name: string;
  desc: string;
}
