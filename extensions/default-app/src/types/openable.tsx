export type Openable =
  | {
      type: "file";
      filePath: string;
    }
  | {
      type: "file-type";
      uniformTypeId: string;
    };
