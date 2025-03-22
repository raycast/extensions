import { JavaCompatibility } from "./JavaCompatibility";

export interface QuarkusVersion {
  key: string;
  quarkusCoreVersion?: string;
  javaCompatibility?: JavaCompatibility;
  platformVersion?: string;
  recommended?: boolean;
  status?: string;
  lts?: boolean;
}
