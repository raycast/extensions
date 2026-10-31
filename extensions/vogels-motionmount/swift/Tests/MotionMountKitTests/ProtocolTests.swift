import Foundation
import Testing
@testable import MotionMountKit

@Test func decodesPositionReadFromTheMountInSofaPosition() {
    let position = Position(distance: Data([0x00, 0x5f]), rotation: Data([0xff, 0xa8]))
    #expect(position == Position(distance: 95, rotation: -88))
}

@Test func rejectsTruncatedPositionReadsInsteadOfCrashingTheCommand() {
    #expect(Position(distance: Data(), rotation: Data([0x00, 0x00])) == nil)
    #expect(Position(distance: Data([0x00, 0x5f]), rotation: Data([0xff])) == nil)
}

@Test func encodesTargetAsBigEndianDistanceThenRotationLikeTheOfficialApp() {
    #expect(Position(distance: 95, rotation: -86).encoded == Data([0x00, 0x5f, 0xff, 0xaa]))
}

@Test func clampsDistanceToTheMotorRange() {
    #expect(Position(distance: 150, rotation: 0).clamped == Position(distance: 100, rotation: 0))
    #expect(Position(distance: -5, rotation: 0).clamped == Position(distance: 0, rotation: 0))
}

@Test func limitsRotationToDistanceBecauseTheTvCannotTurnWhileAgainstTheWall() {
    #expect(Position(distance: 30, rotation: -80).clamped == Position(distance: 30, rotation: -30))
    #expect(Position(distance: 0, rotation: 50).clamped == Position(distance: 0, rotation: 0))
}

@Test func decodesPresetStoredOnTheMount() {
    let part1 = Data([0x01, 0x00, 0x5f, 0xff, 0xaa]) + Data("Sofa".utf8) + Data(count: 11)
    let preset = Preset(index: 0, part1: part1, part2: nil)
    #expect(preset == Preset(index: 0, name: "Sofa", position: Position(distance: 95, rotation: -86)))
}

@Test func emptyPresetSlotsAreHiddenLikeInTheOfficialApp() {
    #expect(Preset(index: 3, part1: Data(count: 20), part2: nil) == nil)
}

@Test func longPresetNamesContinueInTheSecondCharacteristic() {
    let part1 = Data([0x01, 0x00, 0x32, 0x00, 0x0a]) + Data("Lectura junto v".utf8)
    let part2 = Data("entana".utf8) + Data(count: 11)
    #expect(Preset.needsSecondPart(part1))
    #expect(Preset(index: 1, part1: part1, part2: part2)?.name == "Lectura junto ventana")
}

@Test func shortPresetNamesFitInTheFirstCharacteristic() {
    let part1 = Data([0x01, 0x00, 0x5f, 0xff, 0xaa]) + Data("Sofa".utf8) + Data(count: 11)
    #expect(!Preset.needsSecondPart(part1))
}

@Test func encodesPresetInTheTwoCharacteristicsTheMountExpects() {
    let preset = Preset(index: 0, name: "Sofa", position: Position(distance: 95, rotation: -86))
    let (part1, part2) = preset.encoded
    #expect(part1 == Data([0x01, 0x00, 0x5f, 0xff, 0xaa]) + Data("Sofa".utf8) + Data(count: 11))
    #expect(part2 == Data(count: 17))
}

@Test func encodedPresetRoundTripsSoSavedPresetsReadBackIdentically() {
    let preset = Preset(index: 4, name: "Lectura junto ventana", position: Position(distance: 50, rotation: 10))
    let (part1, part2) = preset.encoded
    #expect(part1.count == 20 && part2.count == 17)
    #expect(Preset(index: 4, part1: part1, part2: part2) == preset)
}

@Test func truncatesNamesToTheThirtyTwoBytesTheMountStoresWithoutBreakingCharacters() {
    let preset = Preset(index: 0, name: String(repeating: "ñ", count: 20), position: Position(distance: 10, rotation: 0))
    let (part1, part2) = preset.encoded
    #expect(Preset(index: 0, part1: part1, part2: part2)?.name == String(repeating: "ñ", count: 16))
}

@Test func clearedSlotIsAllZerosSoTheMountAndOfficialAppTreatItAsEmpty() {
    let (part1, part2) = Preset.cleared
    #expect(part1 == Data(count: 20) && part2 == Data(count: 17))
}

@Test func newPresetsGoInTheFirstFreeSlot() {
    let used = [0, 1, 3].map { Preset(index: $0, name: "P\($0)", position: Position(distance: 0, rotation: 0)) }
    #expect(Preset.firstFreeSlot(among: used) == 2)
}

@Test func noFreeSlotWhenAllTenAreUsed() {
    let used = (0..<10).map { Preset(index: $0, name: "P\($0)", position: Position(distance: 0, rotation: 0)) }
    #expect(Preset.firstFreeSlot(among: used) == nil)
}

@Test func diagnosticsStateFollowsTheOfficialAppInterpretation() {
    #expect(DiagnosticsState(byte: 0x05) == .running(step: 5))
    #expect(DiagnosticsState(byte: 0x00) == .passed)
    #expect(DiagnosticsState(byte: 0xff) == .failed(code: -1))
    #expect(DiagnosticsState(byte: 0xfe) == .failed(code: -2))
}
