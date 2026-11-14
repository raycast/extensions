import ApplicationServices
import Foundation

// A read-only check: opening Settings and granting permission remain explicit user actions.
let status = ["accessibility": AXIsProcessTrusted()]
let data = try JSONSerialization.data(withJSONObject: status)
print(String(data: data, encoding: .utf8)!)
