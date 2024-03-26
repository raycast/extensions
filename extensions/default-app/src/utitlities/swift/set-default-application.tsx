import {
  setDefaultApplicationForFileType as setDefaultApplicationForFileType_swift,
  setDefaultApplicationForFile as setDefaultApplicationForFile_swift,
} from "swift:../../../swift/DefaultAppUtils";

type SetDefaultApplicationValues =
  | {
      for: "type";
      applicationPath: string;
      uniformTypeId: string;
    }
  | {
      for: "file";
      applicationPath: string;
      filePath: string;
    };

export async function setDefaultApplication(values: SetDefaultApplicationValues): Promise<void> {
  if (values.for === "type") {
    return await setDefaultApplicationForFileType_swift({
      applicationPath: values.applicationPath,
      uniformTypeId: values.uniformTypeId,
    });
  } else if (values.for === "file") {
    return await setDefaultApplicationForFile_swift({
      applicationPath: values.applicationPath,
      filePath: values.filePath,
    });
  }
}
