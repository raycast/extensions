import XCTest

import bclmTests

var tests = [XCTestCaseEntry]()
tests += bclmTests.allTests()
XCTMain(tests)
