declare module 'unzip-stream' {
  import { Transform } from 'stream';
  
  export interface ExtractOptions {
    path?: string;
  }
  
  export function Extract(opts?: ExtractOptions): Transform;
} 