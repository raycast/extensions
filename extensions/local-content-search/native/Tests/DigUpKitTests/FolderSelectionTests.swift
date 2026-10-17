import Foundation
import Testing
@testable import DigUpKit

@Suite struct FolderSelectionTests {
    let folder: URL = {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("DigUpTests-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return URL(fileURLWithPath: String(cString: realpath(url.path, nil)))   // /private/var/…, as crawls report it
    }()

    @Test func uncheckingASubfolderSkipsIt() {
        var selection = FolderSelection(chosen: ["/D"])
        selection.setSubfolder("/D/Courses", on: false)
        #expect(selection.skipped == ["/D/Courses"])
        #expect(selection.mark("/D") == .mixed)
        #expect(!selection.isSearched("/D/Courses/week1.mp4"))
        #expect(selection.isSearched("/D/Books/a.pdf"))
        selection.setFolder("/D", on: true)   // a click on a mixed checkbox: all of it
        #expect(selection.skipped.isEmpty)
        #expect(selection.mark("/D") == .on)
    }

    @Test func checkingASubfolderChoosesItAlone() {
        var selection = FolderSelection()
        selection.setSubfolder("/D/Receipts", on: true)
        #expect(selection.chosen == ["/D/Receipts"])
        #expect(selection.mark("/D") == .mixed)
        #expect(selection.isSearched("/D/Receipts/may.pdf"))
        #expect(!selection.isSearched("/D/other.pdf"))
        #expect(selection.folders == ["/D/Receipts"])
        selection.setFolder("/D", on: true)
        #expect(selection.chosen == ["/D"])   // the subfolder is covered now
        selection.setFolder("/D", on: false)
        #expect(selection.chosen.isEmpty)
        #expect(selection.mark("/D") == .off)
    }

    @Test func uncheckingAFolderDropsItsSubfolderChoicesButNotDeeperSkips() {
        var selection = FolderSelection(chosen: ["/D"], skipped: ["/D/A", "/D/B/old"])
        selection.setFolder("/D", on: false)
        #expect(selection.chosen.isEmpty)
        #expect(selection.skipped == ["/D/B/old"])
        #expect(selection.effectiveSkips.isEmpty)   // nothing around it is searched
    }

    @Test func aChosenFolderInsideASkippedOneIsSearchedWhole() {
        var selection = FolderSelection(chosen: ["/D"], skipped: ["/D/Media"])
        selection.setSubfolder("/D/Media/Courses", on: true)
        #expect(selection.chosen == ["/D", "/D/Media/Courses"])
        #expect(selection.isSearched("/D/Media/Courses/week1/a.mp4"))
        #expect(!selection.isSearched("/D/Media/film.mp4"))
        #expect(selection.folders == ["/D", "/D/Media/Courses"])   // not covered by /D: Media is skipped
        selection.setSubfolder("/D/Media/Courses/old", on: false)
        #expect(!selection.isSearched("/D/Media/Courses/old/b.mp4"))
    }

    @Test func foldersInsideAnotherChosenOneAreCovered() {
        let selection = FolderSelection(chosen: ["/D/A", "/D", "/E"])
        #expect(selection.folders == ["/D", "/E"])
        #expect(selection.searchedAs("/D/A/x.png") == "/D/A")   // the closest
    }

    @Test func keptFoldersStayWhateverIsClicked() {
        var selection = FolderSelection(kept: ["/D/Receipts"])
        #expect(selection.mark("/D") == .mixed)
        selection.setFolder("/D", on: true)
        #expect(selection.folders == ["/D"])
        selection.setFolder("/D", on: false)
        #expect(selection.folders == ["/D/Receipts"])
        #expect(selection.mark("/D") == .mixed)
    }

    @Test func checkingASkippedFolderTakesTheSkipBack() {
        var selection = FolderSelection(skipped: ["/H/Movies"], kept: ["/H"])
        #expect(!selection.isSearched("/H/Movies"))
        selection.setFolder("/H/Movies", on: true)
        #expect(selection.skipped.isEmpty)
        #expect(selection.chosen.isEmpty)   // searched as part of /H again
        selection.setFolder("/H/Movies", on: false)
        #expect(selection.skipped == ["/H/Movies"])
    }

    @Test func pathsAreComparedByWholeNames() {
        #expect(!FolderSelection.isInside("/a/bc", "/a/b"))
        #expect(FolderSelection.isInside("/a/b/c", "/a/b"))
        #expect(!FolderSelection(chosen: ["/a/b"]).isSearched("/a/bc/x"))
    }

    @Test func crawlsLeaveSkipsOutButWalkChosenFoldersInsideThem() throws {
        let downloads = folder.appendingPathComponent("D")
        let courses = downloads.appendingPathComponent("Media/Courses")
        for (path, text) in [("D/top.txt", "top"), ("D/Media/film.txt", "film"),
                             ("D/Media/Courses/week1.txt", "week one"), ("D/Media/Courses/Old/old.txt", "old")] {
            let url = folder.appendingPathComponent(path)
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(text.utf8).write(to: url)
        }
        var options = IndexOptions()
        options.excludedFolders = [downloads.appendingPathComponent("Media").path, courses.appendingPathComponent("Old").path]
        let names = Crawler.crawl([downloads, courses], options: options).candidates
            .map { ($0.path as NSString).lastPathComponent }.sorted()
        #expect(names == ["top.txt", "week1.txt"])
    }

    @Test func estimatesComeBySubfolder() throws {
        for path in ["F/A/a.txt", "F/A/deeper/b.txt", "F/B/c.txt", "F/loose.txt"] {
            let url = folder.appendingPathComponent(path)
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(String(repeating: "words ", count: 1000).utf8).write(to: url)
        }
        let root = folder.appendingPathComponent("F")
        let candidates = Crawler.crawl([root], options: IndexOptions()).candidates
        let parts = Estimator.estimates(bySubfolder: candidates, of: root.path, options: IndexOptions())
        #expect(Set(parts.keys) == [root.path, root.path + "/A", root.path + "/B"])
        #expect(parts[root.path + "/A"]?.files[.doc] == 2)
        let whole = Estimator.estimate(candidates, options: IndexOptions())
        #expect(abs(parts.values.reduce(Estimate(), +).seconds - whole.seconds) < 1e-9)
    }

    @Test func subfoldersAreNamedAsTheFolderWasGiven() throws {
        let file = folder.appendingPathComponent("F/A/a.txt")
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("notes".utf8).write(to: file)
        // /var/folders/…: what standardizedFileURL makes of the real /private/var/folders/…
        let given = folder.appendingPathComponent("F").standardizedFileURL
        #expect(!given.path.hasPrefix("/private"))
        let candidates = Crawler.crawl([given], options: IndexOptions()).candidates
        let parts = Estimator.estimates(bySubfolder: candidates, of: given.path, options: IndexOptions())
        #expect(Array(parts.keys) == [given.path + "/A"])
        var options = IndexOptions()
        options.excludedFolders = [given.path + "/A"]
        #expect(Crawler.crawl([given], options: options).candidates.isEmpty)
    }

    @Test func filesUnderNestedFoldersComeOnce() throws {
        let store = try IndexStore(directory: folder.appendingPathComponent("index"))
        try store.insert(Candidate(path: "/D/Media/Courses/a.mp4", kind: .video, size: 1, mtime: 1, inode: 1, device: 1))
        #expect(try store.files(under: ["/D", "/D/Media/Courses"]).count == 1)
    }
}
