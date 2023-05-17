import Foundation

struct MessageData {
    let message: String
    let success: Bool
}

func createJSONMessage(messageData: MessageData) -> Result<String, Error> {
    let dict: [String: Any] = ["message": messageData.message, "success": messageData.success]
    let jsonData: Data
    
    do {
        jsonData = try JSONSerialization.data(withJSONObject: dict, options: [])
    } catch {
        return .failure(error)
    }
    
    guard let jsonString = String(data: jsonData, encoding: .utf8) else {
        return .failure(NSError(domain: "com.example.generateJSONString", code: 0, userInfo: nil))
    }
    
    return .success(jsonString)
}

func printMenuItemsAsJSON(_ menuItems: [MenuItem]) -> String {
    var json: [[String: Any]] = []
    for item in menuItems {
        var itemJSON: [String: Any] = [:]
        itemJSON["appDisplayName"] = item.appleMenuItem ? "" : appDisplayName
        itemJSON["title"] = item.shortcut.isEmpty ? item.title : "\(item.title)"
        itemJSON["subtitle"] = item.subtitle
        itemJSON["shortcut"] = item.shortcut.isEmpty ? "" : item.shortcut
        itemJSON["arg"] = item.arg
        itemJSON["uid"] = "\(appBundleId)>\(item.uid)"
        itemJSON["icon"] = item.appleMenuItem ? "apple-icon.png" : appPath
        json.append(itemJSON)
    }
    do {
        let jsonData = try JSONSerialization.data(withJSONObject: json, options: .prettyPrinted)
        let jsonString = String(data: jsonData, encoding: .utf8)!
        return jsonString
    } catch {
        print("Error serializing menu items to JSON: \(error.localizedDescription)")
        return ""
    }
}