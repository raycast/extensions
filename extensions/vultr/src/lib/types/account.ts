import { ACL } from ".";

export type Account = {
  balance: number;
  pending_charges: number;
  name: string;
  email: string;
  acls: ACL[];
  last_payment_date: string;
  last_payment_amount: number;
};

export type AccountBandwidth = {
  previousMonth: {
    timestampStart: string;
    timestampEnd: string;
    gb_in: number;
    gb_out: number;
    totalInstanceHours: number;
    totalInstanceCount: number;
    instanceBandwidthCredits: number;
    freeBandwidthCredits: number;
    purchasedBandwidthCredits: number;
    overage: number;
    overage_unit_cost: number;
    overage_cost: number;
  };
  currentMonthToDate: {
    timestampStart: string;
    timestampEnd: string;
    gb_in: number;
    gb_out: number;
    totalInstanceHours: number;
    totalInstanceCount: number;
    instanceBandwidthCredits: number;
    freeBandwidthCredits: number;
    purchasedBandwidthCredits: number;
    overage: number;
    overage_unit_cost: number;
    overage_cost: number;
  };
  currentMonthProjected: {
    timestampStart: string;
    timestampEnd: string;
    gb_in: number;
    gb_out: number;
    totalInstanceHours: number;
    totalInstanceCount: number;
    instanceBandwidthCredits: number;
    freeBandwidthCredits: number;
    purchasedBandwidthCredits: number;
    overage: number;
    overage_unit_cost: number;
    overage_cost: number;
  };
};
