/**
 * The latest Xcode Swift Playground Swift version.
 */
export const xcodeSwiftPlaygroundLatestSwiftVersion = "6" as const;

/**
 * The Xcode Swift Playground Swift versions.
 */
export const xcodeSwiftPlaygroundSwiftVersions = ["5", "6"] as const;

/**
 * A Xcode Swift Playground Swift version type.
 */
export type XcodeSwiftPlaygroundSwiftVersion = typeof xcodeSwiftPlaygroundSwiftVersions[number];
