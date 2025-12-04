// src/types.ts

// Inverter Info (Realtime)
export interface InverterInfo {
  CustomName: string;
  DT: number;
  ErrorCode: number;
  PVPower: number;
  Show: number;
  StatusCode: number;
  InverterState: string;
  UniqueID: string;
}

export interface InverterInfoResponse {
  Body: {
    Data: {
      [id: string]: InverterInfo;
    };
  };
  Head: {
    Status: {
      Code: number;
      Reason?: string;
      UserMessage?: string;
    };
    TimeStamp: string;
  };
}

// Power Flow Realtime Data (Dashboard)
export interface SiteData {
  BackupMode: number | boolean;
  BatteryStandby: number | boolean;
  E_Total: number | null;
  P_PV: number;
  P_Load: number;
  P_Grid: number;
  P_Akku: number;
  rel_Autonomy: number;
  rel_SelfConsumption: number;
  // Instead of BatterySOC, use the field from the API:
  StateOfCharge_Relative: number;
}

export interface OhmpilotData {
  CodeOfState: number;
  EnergyReal_WAC_Sum_Consumed: number;
}

export interface PowerFlowRealtimeDataResponse {
  Body: {
    Data: {
      Site: SiteData;
      Ohmpilots?: { [key: string]: OhmpilotData };
    };
  };
  Head: {
    Status: {
      Code: number;
      Reason?: string;
      UserMessage?: string;
    };
    TimeStamp: string;
  };
}
