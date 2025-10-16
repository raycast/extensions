export type SuccessResponseMetadata = {
  status: "success";
  statusmsg: string;
  hostname: string;
  ipaddress: string;
  vmstat: "online" | "offline";
};

export type GetVirtualServerStatusResponse = SuccessResponseMetadata;

export type GetVirtualServerInformationResponse = SuccessResponseMetadata & {
  ipaddr: string;
  hdd: string;
  bw: string;
  mem: string;
};

export type RebootVirtualServerResponse = SuccessResponseMetadata & {
  statusmsg: "rebooted";
};
export type BootVirtualServerResponse = SuccessResponseMetadata & {
  statusmsg: "booted";
};
export type ShutdownVirtualServerResponse = SuccessResponseMetadata & {
  statusmsg: "shutdown";
};

export type ErrorResponse = {
  status: "error";
  statusmsg: string;
};

export type SuccessResponse =
  | GetVirtualServerStatusResponse
  | GetVirtualServerInformationResponse
  | RebootVirtualServerResponse
  | BootVirtualServerResponse
  | ShutdownVirtualServerResponse;
