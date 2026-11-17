// Prints the volumes mounted on this Mac as JSON, read the way Sizewise reads them (VolumeClient in
// Sources/SizewiseCore/Volume.swift): FileManager's mounted volumes without the ones macOS hides,
// with the available space Finder shows. Run it on its own with:
//
//   osascript -l JavaScript raycast/assets/mounted-volumes.js
ObjC.import("Foundation");

function run() {
  const keys = {
    importantAvailable: $.NSURLVolumeAvailableCapacityForImportantUsageKey,
    available: $.NSURLVolumeAvailableCapacityKey,
    isStartupDisk: $.NSURLVolumeIsRootFileSystemKey,
    name: $.NSURLVolumeLocalizedNameKey,
    total: $.NSURLVolumeTotalCapacityKey,
  };
  const keyArray = $(Object.values(keys));
  const urls = $.NSFileManager.defaultManager.mountedVolumeURLsIncludingResourceValuesForKeysOptions(
    keyArray,
    $.NSVolumeEnumerationSkipHiddenVolumes,
  );
  const volumes = [];
  for (let index = 0; index < urls.count; index++) {
    const url = urls.objectAtIndex(index);
    const values = ObjC.deepUnwrap(url.resourceValuesForKeysError(keyArray, null)) || {};
    const value = (key) => values[ObjC.unwrap(keys[key])];
    if (typeof value("total") !== "number") continue;
    volumes.push({
      path: ObjC.unwrap(url.path),
      name: value("name") || ObjC.unwrap(url.lastPathComponent),
      totalCapacity: value("total"),
      availableCapacity: value("importantAvailable") ?? value("available") ?? null,
      isStartupDisk: value("isStartupDisk") === true,
    });
  }
  return JSON.stringify(volumes);
}
