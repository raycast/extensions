export interface Device {
  id: string;
  name: string;
  status: string;
  type: string;
  runtime: string;
  category: string;
  deviceType: string; // iPhone, iPad, etc.
}

export interface SimulatorDevice {
  udid: string;
  name: string;
  state: string;
  deviceTypeIdentifier?: string;
}

export interface Category {
  id: string;
  name: string;
}
