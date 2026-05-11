import { SAccount } from "@data/schemas";
import { z } from "zod";

export type TAccount = z.infer<typeof SAccount>;

export type TPackage = {
  name: string;
  versions: string[];
  modified: string;
};

export type TPackageResponse = {
  versions: {
    [key: string]: {
      name: string;
      version: string;
    };
  };
  modified: string;
};
