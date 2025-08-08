// types/csv-parser.d.ts
declare module 'csv-parser' {
  import { Transform } from 'stream';

  function csv(options?: any): Transform;
  export = csv;
}
