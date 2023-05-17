import Foundation

extension MenuItem {

    var appName : String {
        return path[0]
    }
    
    var arg: String {
        return pathIndices
    }

    var uid: String {
        return path.joined(separator: ">")
    }

    var appleMenuItem: Bool {
        return path[0] == "Apple"
    }

    var subtitle: String {
        var p = path
        p.removeLast()
        return p.joined(separator: " > ")
    }

    var title: String {
        return path.last!
    }
}