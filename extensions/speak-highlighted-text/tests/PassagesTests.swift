import Foundation

@main
struct PassagesTests {
    static func main() {
        precondition(Passages.split("   ").isEmpty)
        precondition(Passages.split("Only this.") == ["Only this."])
        let sentence = "When we reached the clearing, the wind finally dropped and everyone could hear birds calling from the trees."
        let second = "After a quiet minute, someone pointed to a narrow bridge at the edge of the grass and we followed them across."
        precondition(Passages.split("Look. " + sentence + "\n\n" + second + " The end.") == ["Look. " + sentence, second + " The end."])

        let clause = String(repeating: "walking ", count: 14) + "slowly,"
        let rest = String(repeating: "resting ", count: 21) + "peacefully."
        precondition(Passages.split(clause + " " + rest) == [clause, rest])
        for length in 1...550 {
            let text = String(repeating: "a", count: length)
            let chunks = Passages.split(text)
            precondition(chunks.joined() == text)
            precondition(chunks.allSatisfy { $0.count >= min(length, Passages.minimum) && $0.count <= Passages.maximum })
        }
        for count in 1...80 {
            let input = (0..<count).map { $0.isMultiple(of: 5) ? "yes." : "remember" }.joined(separator: " ")
            let chunks = Passages.split(input)
            precondition(chunks.joined(separator: " ") == input)
            precondition(chunks.allSatisfy { $0.count >= min(input.count, Passages.minimum) && $0.count <= Passages.maximum })
        }
    }
}
