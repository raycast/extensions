import Foundation  // required: the @raycast macro expands to NSObject-based code
import RaycastSwiftMacros

// Functions exported to TypeScript. Each call spawns this executable once (~7ms), so keep them few and coarse.

@raycast func recentApps() -> [RunningApp] {
  readRecentApps()
}
