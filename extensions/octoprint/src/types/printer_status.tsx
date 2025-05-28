export type PrinterStatusResponse = {
  state: {
    error: string | null;
    flags: {
      cancelling: boolean;
      closedOrError: boolean;
      error: boolean;
      finishing: boolean;
      operational: boolean;
      paused: boolean;
      pausing: boolean;
      printing: boolean;
      ready: boolean;
      resuming: boolean;
      sdReady: boolean;
    };
    text: string;
  };
  temperature: {
    bed: {
      actual: number;
      offset: number;
      target: number;
    };
    tool0: {
      actual: number;
      offset: number;
      target: number;
    };
  };
};

export type JobStatusResponse = {
  job: Job;
  progress: Progress;
  state: string;
};

type Job = {
  file: File;
};

type File = {
  display: string;
  name: string;
  origin: string;
  path: string;
  size: string;
};

type Progress = {
  completion: number;
  printTime: number;
  printTimeLeft: number;
  printTimeLeftOrigin: string;
};
