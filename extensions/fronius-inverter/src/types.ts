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

export interface ApiStatus {
  Code: number;
  Reason?: string;
  UserMessage?: string;
}

export interface ApiHead {
  Status: ApiStatus;
  Timestamp: string;
}

export interface ApiVersionInfo {
  APIVersion: number;
  BaseURL: string;
  CompatibilityRange: string;
}

export interface InverterInfoResponse {
  Body: {
    Data: Record<string, InverterInfo>;
  };
  Head: ApiHead;
}

export interface SiteData {
  BackupMode?: number | boolean;
  BatteryStandby?: number | boolean;
  E_Day?: number | null;
  E_Total: number | null;
  E_Year?: number | null;
  P_PV: number | null;
  P_Load: number | null;
  P_Grid: number | null;
  P_Akku: number | null;
  rel_Autonomy: number | null;
  rel_SelfConsumption: number | null;
  StateOfCharge_Relative?: number | null;
  Meter_Location?: string;
  Mode?: string;
}

export interface RealtimeValueSeries {
  Unit: string;
  Values: Record<string, number | null>;
}

export interface InverterRealtimeDataResponse {
  Body: {
    Data: {
      DAY_ENERGY?: RealtimeValueSeries;
      PAC?: RealtimeValueSeries;
      TOTAL_ENERGY?: RealtimeValueSeries;
      YEAR_ENERGY?: RealtimeValueSeries;
    };
  };
  Head: ApiHead;
}

export interface MeterData {
  Current_AC_Phase_1?: number | null;
  Current_AC_Phase_2?: number | null;
  Current_AC_Phase_3?: number | null;
  EnergyReal_WAC_Minus_Absolute?: number | null;
  EnergyReal_WAC_Plus_Absolute?: number | null;
  Frequency_Phase_Average?: number | null;
  Meter_Location_Current?: number | null;
  PowerReal_P_Sum?: number | null;
  Voltage_AC_Phase_1?: number | null;
  Voltage_AC_Phase_2?: number | null;
  Voltage_AC_Phase_3?: number | null;
}

export interface MeterRealtimeDataResponse {
  Body: { Data: Record<string, MeterData> };
  Head: ApiHead;
}

export interface StorageControllerData {
  Capacity_Maximum?: number | null;
  Current_DC?: number | null;
  DesignedCapacity?: number | null;
  Enable?: number | boolean | null;
  StateOfCharge_Relative?: number | null;
  Status_BatteryCell?: number | string | null;
  Temperature_Cell?: number | null;
  Voltage_DC?: number | null;
}

export interface StorageData {
  Controller?: StorageControllerData;
}

export interface StorageRealtimeDataResponse {
  Body: { Data: Record<string, StorageData> };
  Head: ApiHead;
}

export interface OhmpilotData {
  CodeOfState?: number | null;
  EnergyReal_WAC_Sum_Consumed?: number | null;
  PowerReal_PAC_Sum?: number | null;
  Temperature_Channel_1?: number | null;
}

export interface PowerFlowOhmpilotData {
  P_AC_Total?: number | null;
  State?: number | string | null;
  Temperature?: number | null;
}

export interface PowerFlowRealtimeDataResponse {
  Body: {
    Data: {
      Site: SiteData;
      Ohmpilots?: Record<string, OhmpilotData>;
      Smartloads?: {
        Ohmpilots?: Record<string, PowerFlowOhmpilotData>;
      };
      Version?: string;
    };
  };
  Head: ApiHead;
}
