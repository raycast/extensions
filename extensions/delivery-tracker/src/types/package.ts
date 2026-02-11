export interface Activity {
  time: Date;
  description: string;
  location: string;
}

export interface Package {
  deliveryDate?: Date;
  delivered: boolean;
  activity: Activity[];
}

export interface PackageMap {
  [key: string]: {
    packages: Package[];
    lastUpdated?: Date;
  };
}
