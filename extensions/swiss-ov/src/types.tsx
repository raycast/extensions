export type ConnectionRequirement = {
  from: string;
  to: string;
  isArrival: boolean;
  date: Date;
};

export type OVConnection = {
  transfers: string;
  duration: string;
  from: {
    departureTimestamp: string;
    station: { name: string };
    departure: string;
    platform?: string;
  };
  to: {
    arrival: string;
    arrivalTimestamp: string;
    station: { name: string };
  };
  products: string[];
  sections: [
    {
      departure: { station: { name: string }; departure: string; platform?: string };
      arrival: { station: { name: string }; arrival: string; platform?: string };
    },
  ];
};
