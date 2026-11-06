import Foundation
import RaycastSwiftMacros
import ScriptingBridge
import SQLite3

// MARK: - ScriptingBridge Protocols for Safari

@objc protocol SafariApplication {
  @objc optional var windows: SBElementArray { get }
}

@objc protocol SafariWindow {
  @objc optional var tabs: SBElementArray { get }
  @objc optional var id: Int { get }
}

@objc protocol SafariTab {
  @objc optional var name: String { get }
  @objc optional var URL: String { get }
  @objc optional var index: Int { get }
}

extension SBApplication: SafariApplication {}
extension SBObject: SafariWindow, SafariTab {}

struct LocalTab: Codable {
  let uuid: String
  let title: String
  let url: String
  let window_id: Int
  let index: Int
  let is_local: Bool
  let profileName: String?
}

enum ProfileResolver {
  static func safariDBPaths(bundleIdentifier: String) -> [String] {
    let home = FileManager.default.homeDirectoryForCurrentUser.path
    return [
      "\(home)/Library/Containers/\(bundleIdentifier)/Data/Library/Safari/SafariTabs.db",
      "\(home)/Library/Safari/SafariTabs.db",
      "\(home)/Library/Containers/com.apple.Safari/Data/Library/Safari/SafariTabs.db",
    ]
  }

  // Read profiles from SafariTabs.db: numeric bookmarks.id -> title.
  // windows.active_profile_id stores the numeric bookmarks.id, NOT the UUID serverId.
  static func loadProfiles(bundleIdentifier: String) -> (profiles: [(numericId: Int, serverId: String, title: String)], dbOpen: OpaquePointer?) {
    var db: OpaquePointer?
    var pathUsed: String?
    for p in safariDBPaths(bundleIdentifier: bundleIdentifier) {
      if FileManager.default.fileExists(atPath: p) {
        let rc = sqlite3_open_v2(p, &db, SQLITE_OPEN_READONLY, nil)
        if rc == SQLITE_OK {
          pathUsed = p
          break
        } else if db != nil {
          sqlite3_close(db)
          db = nil
        }
      }
    }
    guard let db = db, pathUsed != nil else { return ([], nil) }

    var profiles: [(Int, String, String)] = []
    let sql = """
      SELECT b.id, b.title, REPLACE(s.server_id, 'Setting_ProfileColor_', '')
      FROM bookmarks b
      JOIN settings s ON s.parent = b.id
      WHERE b.type = 1 AND b.subtype = 2
        AND s.server_id LIKE 'Setting_ProfileColor_%'
        AND (s.deleted IS NULL OR s.deleted = 0);
      """
    var stmt: OpaquePointer?
    if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let stmt = stmt {
      while sqlite3_step(stmt) == SQLITE_ROW {
        let numericId = sqlite3_column_int(stmt, 0)
        let t = sqlite3_column_text(stmt, 1).map { String(cString: $0) } ?? ""
        let serverId = sqlite3_column_text(stmt, 2).map { String(cString: $0) } ?? ""
        let title = t.isEmpty ? "Personal" : t
        if !serverId.isEmpty {
          profiles.append((Int(numericId), serverId, title))
        }
      }
      sqlite3_finalize(stmt)
    }
    return (profiles, db)
  }

  // Open windows ordered by id -> profile title.
  // SB window.id does not exist in DB, so we map by ORDER: SB windows[i] -> DB open windows sorted[i].
  static func orderedWindowProfiles(db: OpaquePointer, profiles: [(numericId: Int, serverId: String, title: String)]) -> [String] {
    let numericToTitle = Dictionary(profiles.map { ($0.numericId, $0.title) }) { first, _ in first }

    func query(_ sql: String) -> [String] {
      var result: [String] = []
      var stmt: OpaquePointer?
      if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let st = stmt {
        while sqlite3_step(st) == SQLITE_ROW {
          let pid = sqlite3_column_int(st, 0)
          if let title = numericToTitle[Int(pid)] { result.append(title) } else { result.append("") }
        }
        sqlite3_finalize(st)
      }
      return result
    }

    var ordered = query("SELECT active_profile_id FROM windows WHERE date_closed IS NULL AND is_last_session=1 ORDER BY id;")
    if ordered.isEmpty {
      ordered = query("SELECT active_profile_id FROM windows WHERE date_closed IS NULL ORDER BY id;")
    }
    return ordered
  }

  static func resolveProfileName(windowIndex: Int, orderedProfiles: [String], profiles: [(numericId: Int, serverId: String, title: String)]) -> String? {
    if windowIndex < orderedProfiles.count {
      let t = orderedProfiles[windowIndex]
      if !t.isEmpty { return t }
    }
    if profiles.count == 1 {
      return profiles[0].title
    }
    return nil
  }
}


// MARK: - Raycast Functions

@raycast func getLocalTabs(appName: String) -> [LocalTab] {
  let bundleIdentifier: String
  switch appName {
  case "Safari Technology Preview":
    bundleIdentifier = "com.apple.SafariTechnologyPreview"
  default:
    bundleIdentifier = "com.apple.Safari"
  }

  guard let safari = SBApplication(bundleIdentifier: bundleIdentifier) as? SafariApplication else {
    return []
  }

  var tabs: [LocalTab] = []

  guard let windows = safari.windows else {
    return []
  }

  // DB is opened read-only; if it cannot be opened (FDA missing) we still return tabs.
  let (profiles, dbHandle) = ProfileResolver.loadProfiles(bundleIdentifier: bundleIdentifier)
  var orderedWindowProfiles: [String] = []
  if let db = dbHandle {
    orderedWindowProfiles = ProfileResolver.orderedWindowProfiles(db: db, profiles: profiles)
    sqlite3_close(db)
  }

  for (windowIndex, window) in windows.enumerated() {
    guard let safariWindow = window as? SafariWindow,
          let windowId = safariWindow.id,
          let windowTabs = safariWindow.tabs else {
      continue
    }

    let profileName = ProfileResolver.resolveProfileName(windowIndex: windowIndex, orderedProfiles: orderedWindowProfiles, profiles: profiles)

    let tabCount = windowTabs.count
    let batchedTitles = windowTabs.array(byApplying: #selector(getter: SafariTab.name))
    let batchedUrls = windowTabs.array(byApplying: #selector(getter: SafariTab.URL))

    // Batched selectors are fast but omit empty values, so preserve alignment
    // with individual reads only for affected windows.
    let tabData: [(title: String, url: String)]
    if batchedTitles.count == tabCount && batchedUrls.count == tabCount {
      tabData = zip(batchedTitles, batchedUrls).map { tab in
        (tab.0 as? String ?? "", tab.1 as? String ?? "")
      }
    } else {
      tabData = windowTabs.compactMap {
        guard let tab = $0 as? SafariTab else {
          return nil
        }
        return (tab.name ?? "", tab.URL ?? "")
      }
    }

    for (tabOffset, tab) in tabData.enumerated() {
      let tabIndex = tabOffset + 1
      tabs.append(LocalTab(
        uuid: "\(windowId)-\(tabIndex)",
        title: tab.title,
        url: tab.url,
        window_id: windowId,
        index: tabIndex,
        is_local: true,
        profileName: profileName
      ))
    }
  }

  return tabs
}
