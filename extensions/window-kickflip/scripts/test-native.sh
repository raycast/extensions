#!/bin/sh
set -eu
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/window-kickflip-tests.XXXXXX")
trap 'rm -rf "$test_dir"' EXIT
swiftc swift/window-kickflip/Sources/FlightPath.swift tests/FlightPathTests.swift -o "$test_dir/flight-tests"
"$test_dir/flight-tests"
swiftc swift/window-kickflip/Sources/WindowIdentity.swift tests/WindowIdentityTests.swift -o "$test_dir/identity-tests"
"$test_dir/identity-tests"
swiftc swift/window-kickflip/Sources/FlightPath.swift swift/window-kickflip/Sources/ThrusterSound.swift tests/ThrusterSoundTests.swift -o "$test_dir/sound-tests"
"$test_dir/sound-tests"
swiftc swift/window-kickflip/Sources/FlightPath.swift swift/window-kickflip/Sources/Thrusters.swift tests/ThrusterTests.swift -o "$test_dir/thruster-tests"
"$test_dir/thruster-tests"
