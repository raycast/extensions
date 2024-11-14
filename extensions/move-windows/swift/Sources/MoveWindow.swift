import Foundation
import CoreGraphics
import RaycastSwiftMacros

enum CustomError: Error {
    case runtimeError(String)
}

func runAppleScript(source: String) -> (Double, Double)? {
    var error: NSDictionary?
    if let script = NSAppleScript(source: source) {
        let output = script.executeAndReturnError(&error)
        if output.numberOfItems == 2, // Ensuring exactly two items are returned
           let firstDescriptor = output.atIndex(1), // Access the first element
           let secondDescriptor = output.atIndex(2) { // Access the second element
            let firstFloat = Double(truncating: firstDescriptor.doubleValue as NSNumber)
            let secondFloat = Double(truncating: secondDescriptor.doubleValue as NSNumber)
            return (firstFloat, secondFloat)
        } else if let error = error {
            print("AppleScript Error: \(error)")
        }
    }
    return nil
}

func getFrontmostWindowPosition() -> CGPoint? {
    let script = """
    tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set frontWindow to front window of frontApp
        if frontWindow is not missing value then
            tell frontApp to set frontmost to true
            set {xPos, yPos} to position of frontWindow
            return {xPos, yPos}
        end if
        return nil
    end tell
    """
    if let position = runAppleScript(source: script){
        let xPos = position.0
        let yPos = position.1 
        print(xPos, yPos)
        return CGPoint(x: xPos + 100, y: yPos + 8)  // Assuming 22px is the title bar height
    }
    print(runAppleScript(source: script))
    return nil
}

func mouseDownAtPoint(point: CGPoint) {
    let source = CGEventSource(stateID: .hidSystemState)
    let mouseDown = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left)
    mouseDown?.post(tap: .cghidEventTap)
}

func mouseUpAtPoint(point: CGPoint) {
    let source = CGEventSource(stateID: .hidSystemState)
    let mouseUp = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left)
    mouseUp?.post(tap: .cghidEventTap)
}

func switchSpace(direction: String) {
    let script = """
    tell application "System Events"
        key code \(direction == "next" ? "124" : "123") using control down
    end tell
    """
    runAppleScript(source: script)
}

@raycast func moveWindowToSpace(direction: String) throws {
    if let titleBarPoint = getFrontmostWindowPosition() {
        print(titleBarPoint.x, titleBarPoint.y)
        mouseDownAtPoint(point: titleBarPoint)
        usleep(100000)
        switchSpace(direction: direction) 
        usleep(100)  // Wait for the space transition to complete
        mouseUpAtPoint(point: titleBarPoint)
    }
    else {
        // throw Error("Cannot Move to \(direction)")
        throw CustomError.runtimeError("Cannot Move to \(direction)")
    }
}