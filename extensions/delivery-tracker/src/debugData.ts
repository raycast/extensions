import { Delivery } from "./delivery";
import { PackageMap } from "./package";

export const debugDeliveries: Delivery[] = [
  {
    id: "E2836A4F-8BC9-463D-A703-EDFF8D1580D9",
    name: "undelivered package that is estimated ahead",
    trackingNumber: "1Zasdf",
    carrier: "ups",
    debug: true,
  },
  {
    id: "E04FEF49-47DD-4D67-A60B-5D9CC6F78C1E",
    name: "delivery date in the past that was delivered",
    trackingNumber: "92462346326",
    carrier: "fedex",
    debug: true,
  },
  {
    id: "D9A04926-2A37-40C1-B2C5-DB2E1924F0A8",
    name: "delivery today that is undelivered",
    trackingNumber: "156845865089045685454467",
    carrier: "usps",
    debug: true,
  },
  {
    id: "195A6D9E-81BC-4CEC-97B7-DB5D5A96E8BC",
    name: "delivery that is unknown",
    trackingNumber: "934724536784235786435786",
    carrier: "usps",
    debug: true,
  },
  {
    id: "13DCF84F-EEE5-4827-AD08-4C0F336E87BB",
    name: "partially delivered",
    trackingNumber: "1Zdflgjadlhjfgasdfasdf",
    carrier: "ups",
    debug: true,
  },
  {
    id: "CF022134-EEE4-4AA1-BD74-64BF36B465FD",
    name: "partially delivered, with unknown delivery dates",
    trackingNumber: "134578458906534",
    carrier: "fedex",
    debug: true,
  },
  {
    id: "DD17AC8D-9048-43ED-AF35-4195A2F97243",
    name: "no packages",
    trackingNumber: "198451726304587",
    carrier: "fedex",
    debug: true,
  },
];

export const debugPackages: PackageMap = {};
debugPackages[debugDeliveries[0].id] = {
  packages: [
    {
      deliveryDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 4), // 4 days ahead
      delivered: false,
      activity: [],
    },
  ],
};
debugPackages[debugDeliveries[1].id] = {
  packages: [
    {
      deliveryDate: new Date("2024-11-09"),
      delivered: true,
      activity: [],
    },
  ],
};
debugPackages[debugDeliveries[2].id] = {
  packages: [
    {
      deliveryDate: new Date(),
      delivered: false,
      activity: [],
    },
  ],
};
debugPackages[debugDeliveries[3].id] = {
  packages: [
    {
      deliveryDate: undefined,
      delivered: false,
      activity: [],
    },
  ],
};
debugPackages[debugDeliveries[4].id] = {
  packages: [
    {
      deliveryDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 4), // 4 days ahead
      delivered: false,
      activity: [],
    },
    {
      deliveryDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 2), // 2 days ahead
      delivered: false,
      activity: [],
    },
    {
      deliveryDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 1), // 1 day ahead
      delivered: true,
      activity: [],
    },
  ],
};
debugPackages[debugDeliveries[5].id] = {
  packages: [
    {
      deliveryDate: undefined,
      delivered: false,
      activity: [],
    },
    {
      deliveryDate: undefined,
      delivered: true,
      activity: [],
    },
    {
      deliveryDate: undefined,
      delivered: false,
      activity: [],
    },
  ],
};
debugPackages[debugDeliveries[6].id] = {
  packages: [],
};
