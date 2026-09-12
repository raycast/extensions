//  Created by Nerd Just on 2024/12/17.
//

import Cocoa
import AppKit
import RaycastSwiftMacros

@raycast func playSvga(resourceURL: String?) {
    let delegate = AppDelegate()
    guard let resourceURL = resourceURL else {
        fatalError("resource url is empty!")
    }
    delegate.resourceUrlString = resourceURL
    NSApplication.shared.delegate = delegate
    NSApplication.shared.run()
}
