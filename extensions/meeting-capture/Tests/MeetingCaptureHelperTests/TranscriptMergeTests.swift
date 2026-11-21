import Foundation
import Testing
@testable import MeetingCaptureHelper

@Test func transcriptPreferenceParsingIsStableAndSafe() {
    #expect(TranscriptLanguageMode.parse("vietnamese") == .vietnamese)
    #expect(TranscriptLanguageMode.parse("ENGLISH") == .english)
    #expect(TranscriptLanguageMode.parse(" vietnamese-english ") == .bilingual)
    #expect(TranscriptLanguageMode.parse("unknown") == .systemDefault)
    #expect(TranscriptLanguageMode.parse(nil) == .systemDefault)
}

@Test func transcriptLocaleMappingAndFallbackAreExplicit() {
    #expect(TranscriptLanguageMode.vietnamese.requestedLocaleIdentifiers == ["vi_VN"])
    #expect(TranscriptLanguageMode.english.requestedLocaleIdentifiers == ["en_US"])
    #expect(TranscriptLanguageMode.bilingual.requestedLocaleIdentifiers == ["vi_VN", "en_US"])
    #expect(TranscriptLanguageMode.systemDefault.requestedLocaleIdentifiers == [Locale.current.identifier])
}

@Test func overlappingNormalizedDuplicatesCollapse() {
    let input = [
        TranscriptSegment(start: 0, end: 1, text: "Xin chào!", localeIdentifier: "vi_VN", confidence: 0.91),
        TranscriptSegment(start: 0.02, end: 1.02, text: "xin chao", localeIdentifier: "en_US", confidence: 0.70),
    ]
    let output = mergeTranscriptSegments(input)
    #expect(output.count == 1)
    #expect(output[0].text == "Xin chào!")
}

@Test func chronologicalMixedLanguageSegmentsRemainInOrder() {
    let input = [
        TranscriptSegment(start: 2, end: 3, text: "launch tomorrow", localeIdentifier: "en_US", confidence: 0.89),
        TranscriptSegment(start: 0, end: 1, text: "Xin chào mọi người", localeIdentifier: "vi_VN", confidence: 0.94),
    ]
    #expect(renderTranscript(mergeTranscriptSegments(input)) == "Xin chào mọi người launch tomorrow")
}

@Test func punctuationAndVietnameseUnicodeArePreserved() {
    let source = "Chúng ta bắt đầu nhé — cảm ơn!"
    let output = mergeTranscriptSegments([
        .init(start: 0, end: 2, text: source, localeIdentifier: "vi_VN", confidence: 0.9),
    ])
    #expect(renderTranscript(output) == source)
}

@Test func emptyPassDoesNotSuppressOtherLanguage() {
    let english = TranscriptSegment(start: 1, end: 2, text: "status update", localeIdentifier: "en_US", confidence: 0.8)
    #expect(mergeTranscriptSegments([]).isEmpty)
    #expect(mergeTranscriptSegments([english]) == [english])
}

@Test func mergeOutputIsDeterministicAcrossInputOrder() {
    let candidates = [
        TranscriptSegment(start: 0, end: 1, text: "hello team", localeIdentifier: "en_US", confidence: 0.8),
        TranscriptSegment(start: 0, end: 1, text: "hello teams", localeIdentifier: "vi_VN", confidence: 0.8),
        TranscriptSegment(start: 2, end: 3, text: "cảm ơn", localeIdentifier: "vi_VN", confidence: nil),
    ]
    #expect(mergeTranscriptSegments(candidates) == mergeTranscriptSegments(candidates.reversed()))
}

@Test func alternativeAgreementBreaksConfidenceTie() {
    let english = TranscriptSegment(start: 0, end: 1, text: "meeting", localeIdentifier: "en_US", confidence: 0.7)
    let vietnamese = TranscriptSegment(start: 0, end: 1, text: "mít tinh", localeIdentifier: "vi_VN", confidence: 0.7, alternatives: ["meeting"])
    #expect(mergeTranscriptSegments([vietnamese, english]).first?.text == "meeting")
}

@Test func moduleSelectionPrefersSpeechThenFallsBackToDictation() {
    #expect(selectTranscriberEngine(speechSupported: true, dictationSupported: true) == .speechTranscriber)
    #expect(selectTranscriberEngine(speechSupported: false, dictationSupported: true) == .dictationTranscriber)
    #expect(selectTranscriberEngine(speechSupported: false, dictationSupported: false) == nil)
}

@Test func automaticInstallationPlansCoverEveryAssetState() {
    #expect(installationPlan(for: .installed) == .ready)
    #expect(installationPlan(for: .supported) == .downloadAndInstall)
    #expect(installationPlan(for: .downloading) == .waitForDownload)
    #expect(installationPlan(for: .unsupported) == .unavailable)
}

@Test func modelDownloadProgressIsClampedAndDeterministic() {
    #expect(modelInstallMessage(language: "Vietnamese", fractionCompleted: nil) == "Downloading Vietnamese model…")
    #expect(modelInstallMessage(language: "Vietnamese", fractionCompleted: 0.426) == "Downloading Vietnamese model… 43%")
    #expect(modelInstallMessage(language: "Vietnamese", fractionCompleted: 2) == "Downloading Vietnamese model… 100%")
}

@Test func reservationFailureKeepsMp3AndExplainsRetry() {
    let message = modelInstallFailureMessage(language: "vi_VN", reason: "locale reservation limit reached")
    #expect(message.contains("MP3 is safe"))
    #expect(message.contains("retry"))
    #expect(message.contains("reservation limit"))
}

@Test func mixedSpeechAndVietnameseDictationSegmentsMergeChronologically() {
    let vietnameseDictation = TranscriptSegment(
        start: 0, end: 1.4, text: "Xin chào mọi người", localeIdentifier: "vi_VN", confidence: 0.86,
        alternatives: ["Xin chào mọi người"]
    )
    let englishSpeech = TranscriptSegment(
        start: 1.5, end: 2.7, text: "release status green", localeIdentifier: "en_US", confidence: 0.92,
        alternatives: ["release status green"]
    )
    #expect(renderTranscript(mergeTranscriptSegments([englishSpeech, vietnameseDictation])) == "Xin chào mọi người release status green")
}

@Test func vietnameseDictationMetadataPreservesUnicodeAndAlternatives() {
    let segment = TranscriptSegment(
        start: 3, end: 4, text: "Cảm ơn", localeIdentifier: "vi_VN", confidence: 0.73,
        alternatives: ["Cám ơn", "Cảm ơn"]
    )
    let output = mergeTranscriptSegments([segment])
    #expect(output == [segment])
    #expect(renderTranscript(output) == "Cảm ơn")
}
