import Foundation

// Stand-ins supply encoder inputs; the encoder and URL parser come from Glimmer.
struct LibraryApp { let id: Int; let name: String }
struct Host { let id: String; let displayName: String; let manualAddress: String?; let apps: [LibraryApp] }
struct HostApp { let id: Int; let name: String; let hdrCapable: Bool; let hidden: Bool }
struct HostLiveStatus {
    enum State: Equatable { case idle, asleep, certMismatch, streamingApp(String), streamingUnknownApp(Int), unknown }
    let hostID: String
    let state: State
    var runningAppID: Int? = nil
}
struct StreamStatsSnapshot {
    let configuredFps: Double
    let videoCodec: String
    let negotiatedBitrateMbps: Double
}
enum GlimmerCLI {
    enum Verb: String { case pair, list, status, stream, stop, quit, wake, help }
    struct Command { let verb: Verb; let arguments: [String] }
}

func decoded(_ json: String) throws -> Any {
    try JSONSerialization.jsonObject(with: Data(json.utf8))
}

let app = LibraryApp(id: 7, name: "Hades II")
let pc = Host(id: "pc-id", displayName: "Den PC", manualAddress: "Den.local:47989", apps: [app])
let states: [HostLiveStatus.State] = [
    .idle, .asleep, .certMismatch, .unknown, .streamingApp("Hades II"),
    .streamingUnknownApp(99), .streamingApp("Unlisted game")
]
var rows = states.map { state in
    CommandJSON.pc(pc, live: HostLiveStatus(hostID: pc.id, state: state), paired: true, defaultID: pc.id)
}
rows.append(CommandJSON.pc(
    Host(id: "other-id", displayName: "客厅 PC", manualAddress: nil, apps: []),
    live: nil, paired: false, defaultID: nil))

let urls: [[String: String]] = [
    ["action": "stream", "pc": "Den PC", "app": "Hades II",
     "url": "glimmer://stream?pc=Den%20PC&app=Hades%20II"],
    ["action": "stream", "pc": "Den%20PC", "app": "A+B&C",
     "url": "glimmer://stream?pc=Den%2520PC&app=A%2BB%26C"],
    ["action": "stream", "pc": "客厅 café 🎮", "app": "雪 + #?/%&=",
     "url": "glimmer://stream?pc=%E5%AE%A2%E5%8E%85%20caf%C3%A9%20%F0%9F%8E%AE&app=%E9%9B%AA%20%2B%20%23%3F%2F%25%26%3D"],
    ["action": "stream", "pc": "pc-id", "url": "glimmer://stream?pc=pc-id"],
    ["action": "wake", "pc": "Den PC", "url": "glimmer://wake?pc=Den%20PC"],
    ["action": "quit", "pc": "[2001:db8::1]", "url": "glimmer://quit?pc=%5B2001%3Adb8%3A%3A1%5D"],
    ["action": "stop", "url": "glimmer://stop"],
    ["action": "stop", "pc": "Den PC", "url": "glimmer://stop?pc=Den%20PC"],
    ["action": "stop", "pc": "PC-ID", "url": "glimmer://stop?pc=PC-ID"],
    ["action": "stop", "pc": "DEN.local:47989", "url": "glimmer://stop?pc=DEN.local%3A47989"],
    ["action": "stop", "pc": "客厅 + PC", "url": "glimmer://stop?pc=%E5%AE%A2%E5%8E%85%20%2B%20PC"]
]
for row in urls {
    let command = GlimmerCLI.parseURL(URL(string: row["url"]!)!)
    precondition(command?.verb.rawValue == row["action"])
    precondition(command?.arguments == (row["pc"].map { [$0] } ?? []) + (row["app"].map { [$0] } ?? []))
}
let rejected = [
    "glimmer://pair?pc=Den", "glimmer://unknown?pc=Den",
    "glimmer://stream?pc=Den&force=1", "glimmer://stream?pc=Den&pc=Other",
    "glimmer://wake?pc=Den&app=A", "glimmer://quit?pc=Den&app=A",
    "glimmer://stream?pc=", "glimmer://stream?pc=%20", "glimmer://stream?pc=Den%0A",
    "glimmer://stream?pc=Den%E2%80%8B", "glimmer://stream?pc=Den%E2%80%AE",
    "glimmer://stop?pc=", "glimmer://stop?pc=%20", "glimmer://stop?pc=Den%0A",
    "glimmer://stop?pc=Den%E2%80%8B", "glimmer://stop?pc=Den%E2%80%AE",
    "glimmer://stop?pc=Den&app=A", "glimmer://stop?app=A",
    "glimmer://stop?pc=Den&pc=Other", "glimmer://stop?force=1"
]
for url in rejected { precondition(GlimmerCLI.parseURL(URL(string: url)!) == nil) }

let snapshot = StreamStatsSnapshot(configuredFps: 120, videoCodec: "HEVC", negotiatedBitrateMbps: 82.5)
let fixture: [String: Any] = [
    "pcs": try decoded(CommandJSON.encode(["pcs": rows])),
    "pcsEmpty": try decoded(CommandJSON.encode(["pcs": []])),
    "apps": try decoded(CommandJSON.apps([
        HostApp(id: 7, name: "Game, \"two\"\n雪", hdrCapable: true, hidden: true),
        HostApp(id: 9, name: "Desktop", hdrCapable: false, hidden: false)
    ], runningID: 7)),
    "appsEmpty": try decoded(CommandJSON.apps([], runningID: 0)),
    "statusIdle": try decoded(CommandJSON.status(live: false)),
    "statusLive": try decoded(CommandJSON.status(live: true, pc: pc, app: app,
        resolution: (2560, 1440), hdr: true, snapshot: snapshot)),
    "statusUnknown": try decoded(CommandJSON.status(live: true, resolution: (0, 0),
        snapshot: StreamStatsSnapshot(configuredFps: .nan, videoCodec: "HEVC", negotiatedBitrateMbps: .infinity))),
    "statusReconnecting": try decoded(CommandJSON.status(live: false, pc: pc, app: app)),
    "stopStopped": try decoded(CommandJSON.encode(["result": "stopped", "stopped": true])),
    "stopIdle": try decoded(CommandJSON.encode(["result": "noActiveStream", "stopped": false])),
    "urls": urls, "rejectedURLs": rejected
]
print(String(decoding: try JSONSerialization.data(withJSONObject: fixture, options: [.sortedKeys]), as: UTF8.self))
