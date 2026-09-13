export type OutputMode = "raw" | "inline" | "display";

export type OcrResult = {
  latex: string;
  tokenCount: number;
  meanTokenProbability: number;
  minimumTokenProbability: number;
  eosReached: boolean;
  syntaxValid: boolean;
  elapsedMs: number;
  backend: "coreml" | "cpu" | "wasm";
  reviewReasons: string[];
};

export type WorkerRequest =
  | { protocol: 3; type: "ping"; requestId: string; authToken: string }
  | {
      protocol: 3;
      type: "recognize";
      requestId: string;
      authToken: string;
      imagePath: string;
      modelDirectory: string;
    }
  | {
      protocol: 3;
      type: "warm";
      requestId: string;
      authToken: string;
      modelDirectory: string;
    };

export type WorkerResponse =
  | { protocol: 3; requestId: string; ok: true; result?: OcrResult; pong?: true }
  | { protocol: 3; requestId: string; ok: false; error: string };

export type ReviewRecord = {
  version: 1;
  requestId: string;
  createdAt: number;
  imagePath: string;
  outputMode: OutputMode;
  commandName: string;
  result: OcrResult;
};
