declare module "node-record-lpcm16" {
  interface Recording {
    stream(): NodeJS.ReadableStream;
    stop(): void;
  }
  interface RecordOptions {
    sampleRate: number;
    channels: number;
    audioType: string;
    recorder?: string;
  }
  function record(options: RecordOptions): Recording;
  export = { record };
}

declare module "node-whisper" {
  interface WhisperOptions {
    modelName: string;
    whisperOptions?: {
      language?: string;
    };
  }
  interface TranscriptionResult {
    text: string;
  }
  export class NodeWhisper {
    constructor(options: WhisperOptions);
    transcribe(filePath: string): Promise<TranscriptionResult>;
  }
}

export interface TranscriptionEntry {
  id: string;
  text: string;
  timestamp: number;
  audioFilePath?: string;
}
