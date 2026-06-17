type GcodeFile = {
  date: number;
  display: string;
  gcodeAnalysis: {
    dimensions: {
      depth: number;
      height: number;
      width: number;
    };
    estimatedPrintTime: number;
    filament: {
      tool0: {
        length: number;
        volume: number;
      };
    };
    printingArea: {
      maxX: number;
      maxY: number;
      maxZ: number;
      minX: number;
      minY: number;
      minZ: number;
    };
    travelArea: {
      maxX: number;
      maxY: number;
      maxZ: number;
      minX: number;
      minY: number;
      minZ: number;
    };
    travelDimensions: {
      depth: number;
      height: number;
      width: number;
    };
  };
  children: GcodeFile[];
  hash: string;
  name: string;
  origin: string;
  path: string;
  prints: {
    failure: number;
    last: {
      date: number;
      printTime: number;
      success: boolean;
    };
    success: number;
  };
  refs: {
    download: string;
    resource: string;
  };
  size: number;
  statistics: {
    averagePrintTime: { _default: number };
    lastPrintTime: { _default: number };
  };
  type: string;
  typePath: string[];
};

export type GcodeFilesResponse = {
  files: GcodeFile;
  free: number;
  total: number;
};
