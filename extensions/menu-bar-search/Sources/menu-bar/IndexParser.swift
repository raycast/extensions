//
//  IndexParser.swift
//  Menu
//
//  Created by Benzi on 24/04/17.
//  Copyright © 2017 Benzi Ahamed. All rights reserved.
//

import Foundation

public enum IndexParser {
    // parse integers out of a given text string
    public static func parse(_ text: String) -> [Int] {
        var i = text.unicodeScalars.startIndex
        let end = text.unicodeScalars.endIndex
        var n = 0
        var pending = false
        var indices = [Int]()
        while i < end {
            let c = text.unicodeScalars[i].value
            if c >= 48, c <= 57 {
                n = n * 10 + Int(c - 48) // "0" is 48
                pending = true
            }
            else if pending {
                indices.append(n)
                n = 0
                pending = false
            }
            i = text.unicodeScalars.index(after: i)
        }
        if pending {
            indices.append(n)
        }
        return indices
    }
}