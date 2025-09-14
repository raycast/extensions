export interface StatusSettings {
  units: "mg/dl" | "mmol";
  timeFormat: number;
  dayStart: number;
  dayEnd: number;
  nightMode: boolean;
  editMode: boolean;
  showRawbg: string;
  customTitle: string;
  theme: string;
  alarmUrgentHigh: boolean;
  alarmUrgentHighMins: number[];
  alarmHigh: boolean;
  alarmHighMins: number[];
  alarmLow: boolean;
  alarmLowMins: number[];
  alarmUrgentLow: boolean;
  alarmUrgentLowMins: number[];
  alarmUrgentMins: number[];
  alarmWarnMins: number[];
  alarmTimeagoWarn: boolean;
  alarmTimeagoWarnMins: number;
  alarmTimeagoUrgent: boolean;
  alarmTimeagoUrgentMins: number;
  alarmPumpBatteryLow: boolean;
  language: string;
  scaleY: string;
  showPlugins: string;
  showForecast: string;
  focusHours: number;
  heartbeat: number;
  baseURL: string;
  authDefaultRoles: string;
  thresholds: {
    bgHigh: number;
    bgTargetTop: number;
    bgTargetBottom: number;
    bgLow: number;
  };
  insecureUseHttp: boolean;
  secureHstsHeader: boolean;
  secureHstsHeaderIncludeSubdomains: boolean;
  secureHstsHeaderPreload: boolean;
  secureCsp: boolean;
  deNormalizeDates: boolean;
  showClockDelta: boolean;
  showClockLastTime: boolean;
  frameUrl1: string;
  frameUrl2: string;
  frameUrl3: string;
  frameUrl4: string;
  frameUrl5: string;
  frameUrl6: string;
  frameUrl7: string;
  frameUrl8: string;
  frameName1: string;
  frameName2: string;
  frameName3: string;
  frameName4: string;
  frameName5: string;
  frameName6: string;
  frameName7: string;
  frameName8: string;
  authFailDelay: number;
  adminNotifiesEnabled: boolean;
  authenticationPromptOnLoad: boolean;
  DEFAULT_FEATURES: string[];
  alarmTypes: string[];
  enable: string[];
}

export interface StatusExtendedSettings {
  devicestatus?: {
    advanced: boolean;
    days: number;
  };
}

export interface StatusAuthorized {
  token: string;
  sub: string;
  permissionGroups: string[][];
  iat: number;
  exp: number;
}

export interface StatusResponse {
  status: string;
  name: string;
  version: string;
  serverTime: string;
  serverTimeEpoch: number;
  apiEnabled: boolean;
  careportalEnabled: boolean;
  boluscalcEnabled: boolean;
  settings: StatusSettings;
  extendedSettings: StatusExtendedSettings;
  authorized: StatusAuthorized;
  runtimeState: string;
}
