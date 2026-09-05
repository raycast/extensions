const attributeDescriptions: Record<string, string> = {
  // Security & Quarantine attributes
  "com.apple.quarantine":
    "Added by macOS when files come from the internet. Stores quarantine flag, timestamp, source, and agent.",
  "com.apple.provenance": "Tracks origin information used by macOS security features for apps and executables.",
  "com.apple.macl":
    "Binary user-intent access metadata used by macOS privacy protections. Records contain a header and an app UUID; app UUIDs may be session-specific.",
  "com.apple.rootless": "Marks content protected by System Integrity Protection (SIP).",

  // Standard Metadata (kMDItem) attributes
  "com.apple.metadata:kMDItemWhereFroms": "One or more URLs describing where the file was downloaded from.",
  "com.apple.metadata:kMDItemDownloadedDate": "The date and time the file finished downloading.",
  "com.apple.metadata:kMDItemDownloadedBy": "Identifier of the app or user account that downloaded the file.",
  "com.apple.metadata:kMDItemContentCreationDate": "When the file's primary content was created.",
  "com.apple.metadata:kMDItemContentModificationDate": "When the file's content was last modified.",
  "com.apple.metadata:kMDItemContentType": "Uniform Type Identifier (UTI) for the file type.",
  "com.apple.metadata:kMDItemContentTypeTree": "Hierarchy of UTIs describing the file type.",
  "com.apple.metadata:kMDItemAuthors": "Authors or creators recorded for the document.",
  "com.apple.metadata:kMDItemTitle": "Document title stored in metadata.",
  "com.apple.metadata:kMDItemDescription": "Short description used in Spotlight and Finder previews.",
  "com.apple.metadata:kMDItemKeywords": "Keywords or tags assigned for search and organization.",
  "com.apple.metadata:kMDItemContributors": "Additional contributors listed for the document.",
  "com.apple.metadata:kMDItemCopyright": "Copyright notice associated with the file.",
  "com.apple.metadata:kMDItemCreator":
    "Name of the application that originally created the file (e.g. 'Adobe Photoshop').",
  "com.apple.metadata:kMDItemHeadline": "Headline or summary text stored in metadata.",
  "com.apple.metadata:kMDItemFinderComment": "Finder \u201CGet Info\u201D comment.",
  "com.apple.metadata:kMDItemOriginApplicationIdentifier":
    "Bundle identifier for the app that produced the file or download.",
  "com.apple.metadata:kMDItemOriginMessageID": "Mail or Messages identifier the file originated from, if present.",
  "com.apple.metadata:kMDItemOriginSenderDisplayName": "Display name of the sender the file came from.",

  // User tags (the actual on-disk xattr uses the underscore-prefixed key)
  "com.apple.metadata:_kMDItemUserTags": "User-applied Finder tags stored as a binary plist array.",
  "com.apple.metadata:kMDItemUserTags": "Spotlight query key for Finder tags (on-disk xattr is _kMDItemUserTags).",

  // Backup & Time Machine
  "com.apple.metadata:com_apple_backup_excludeItem":
    "Marks the file to be excluded from Time Machine and other backups.",
  "com.apple.metadata:_kTimeMachineNewestSnapshot":
    "Details about the most recent Time Machine snapshot containing this file.",
  "com.apple.metadata:_kTimeMachineOldestSnapshot":
    "Details about the oldest Time Machine snapshot containing this file.",

  // Finder & File System attributes
  "com.apple.FinderInfo":
    "Finder flags and legacy metadata including type/creator codes, label color, and visibility flags.",
  "com.apple.lastuseddate#PS": "The last time the file was opened (stored as a plist-style date).",
  "com.apple.TextEncoding": "Preferred text encoding for the file.",
  "com.apple.ResourceFork":
    "Legacy resource fork data. Used to preserve resource forks on volumes that lack native support (e.g. network shares).",
  "com.apple.decmpfs": "Compressed data or metadata used by transparent file compression (HFS+ and APFS).",

  // iCloud attributes
  "com.apple.cscachefs": "iCloud Drive marker tying files to an application or cache set.",
  "com.apple.icloud.itemName": "Placeholder filename for iCloud Drive items not yet downloaded.",

  // Disk image attributes
  "com.apple.diskimages.fsck": "Record of the last disk image integrity check.",
  "com.apple.diskimages.recentcksum": "Checksum record used by disk images.",

  // System & Application attributes
  "com.apple.LaunchServices.OpenWith": "Overrides the default app to open this file.",
  "com.apple.logd.metadata": "System logging metadata stored by logd.",
  "com.apple.uuiddb.boot-uuid": "Boot UUID metadata used by system logging.",
};

export function getAttributeDescription(name: string): string | undefined {
  if (attributeDescriptions[name]) {
    return attributeDescriptions[name];
  }

  if (name.startsWith("com.apple.metadata:kMDLabel_")) {
    return "Opaque Spotlight/Finder label metadata. The suffix identifies the label record; the value is binary system metadata rather than a property list.";
  }

  for (const prefix of Object.keys(attributeDescriptions)) {
    if (prefix.endsWith(":") && name.startsWith(prefix)) {
      return attributeDescriptions[prefix];
    }
  }

  return undefined;
}
