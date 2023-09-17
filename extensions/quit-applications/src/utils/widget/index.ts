import { Application } from "../../types";

export function sortApplicationsInAlphabeticalOrder<T extends Pick<Application, "name">>(a: T, b: T): number {
  if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) return -1;
  if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) return 1;

  return 0;
}

export function fetchApplicationIcon<T extends Omit<Application, "icon">>(application: T): Application {
  const [applicationPath] = application.path.split("Contents");

  if (applicationPath.includes(".app")) {
    return {
      ...application,
      fileIcon: applicationPath,
    };
  }

  // TODO - add fallback resolution for non .app files

  return {
    ...application,
    fileIcon: application.name,
  };
}

// function applicationIconFromPath(path: string): string {
//   /* Example:
//    * '/Applications/Visual Studio Code.app' -> '/Applications/Visual Studio Code.app/Contents/Resources/{file name}.icns'
//    */

//   // read path/Contents/Info.plist and look for <key>CFBundleIconFile</key> or <key>CFBundleIconName</key>
//   // the actual icon file is located at path/Contents/Resources/{file name}.icns

//   const infoPlist = `${path}/Contents/Info.plist`;

//   const possibleIconKeyNames = ["CFBundleIconFile", "CFBundleIconName"];

//   let iconFileName = null;

//   for (const keyName of possibleIconKeyNames) {
//     try {
//       iconFileName = execSync(["plutil", "-extract", keyName, "raw", '"' + infoPlist + '"'].join(" "))
//         .toString()
//         .trim();
//       break;
//     } catch (error) {
//       continue;
//     }
//   }

//   if (!iconFileName) {
//     // no icon found. fallback to empty string (no icon)
//     return "";
//   }

//   // if icon doesn't end with .icns, add it
//   if (!iconFileName.endsWith(".icns")) {
//     iconFileName = `${iconFileName}.icns`;
//   }

//   const iconPath = `${path}/Contents/Resources/${iconFileName}`;
//   console.log(iconPath);
//   return iconPath;
// }
