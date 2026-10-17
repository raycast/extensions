import Testing
@testable import LlamaRuntime

/// llama.cpp has to see the pixels the reference sees: transformers' resize target, then PIL's bicubic.
@Suite struct ImageSizingTests {
    @Test func targetSizeFillsTheBudget() {
        // A 1440×900 screenshot and a 768×768 photo, at the budgets the indexer uses.
        #expect(ImageSizing.targetSize(height: 900, width: 1440, budget: 280)! == (624, 1008))
        #expect(ImageSizing.targetSize(height: 900, width: 1440, budget: 140)! == (432, 672))
        #expect(ImageSizing.targetSize(height: 900, width: 1440, budget: 70)! == (288, 480))
        #expect(ImageSizing.targetSize(height: 768, width: 768, budget: 280)! == (768, 768))
        #expect(ImageSizing.targetSize(height: 768, width: 768, budget: 140)! == (528, 528))
        // Small images grow to fill it, as in the reference (mtmd alone would leave them small).
        #expect(ImageSizing.targetSize(height: 300, width: 300, budget: 140)! == (528, 528))
    }

    @Test func targetSizeOfAThinImage() {
        // One side rounds to zero: it gets one 48 px row, the other side capped at the budget.
        #expect(ImageSizing.targetSize(height: 10, width: 4000, budget: 140)! == (48, 6720))
    }

    /// A 7×5 image resized by PIL (Image.resize, BICUBIC) in the worker's Python environment.
    static let source: [UInt8] = [0, 115, 230, 3, 118, 233, 6, 121, 236, 9, 124, 239, 12, 127, 242, 15, 130, 245, 18,
        133, 248, 77, 192, 51, 80, 195, 54, 83, 198, 57, 86, 201, 60, 89, 204, 63, 92, 207, 66, 95, 210, 69, 154, 13,
        128, 157, 16, 131, 160, 19, 134, 163, 22, 137, 166, 25, 140, 169, 28, 143, 172, 31, 146, 231, 90, 205, 234, 93,
        208, 237, 96, 211, 240, 99, 214, 243, 102, 217, 246, 105, 220, 249, 108, 223, 52, 167, 26, 55, 170, 29, 58,
        173, 32, 61, 176, 35, 64, 179, 38, 67, 182, 41, 70, 185, 44]

    @Test func shrinkMatchesPillow() {
        let pil: [UInt8] = [28, 151, 152, 33, 156, 157, 39, 162, 163, 44, 167, 168, 165, 68, 129, 170, 73, 134, 176, 79,
            140, 181, 84, 145, 132, 133, 106, 137, 138, 111, 143, 144, 117, 148, 149, 122]
        #expect(resize(toWidth: 4, toHeight: 3) == pil)
    }

    @Test func growMatchesPillow() {
        let pil: [UInt8] = [0, 112, 237, 0, 113, 238, 1, 116, 241, 3, 118, 243, 5, 120, 245, 7, 122, 247, 9, 124, 249,
            11, 126, 251, 14, 129, 254, 15, 130, 255, 55, 187, 85, 56, 188, 86, 59, 191, 89, 61, 193, 91, 63, 195, 93,
            65, 197, 95, 67, 199, 97, 69, 201, 99, 72, 204, 102, 73, 205, 103, 122, 82, 83, 123, 83, 84, 126, 86, 87,
            128, 88, 89, 130, 90, 91, 132, 92, 93, 134, 94, 95, 136, 96, 97, 139, 99, 100, 140, 100, 101, 199, 27, 173,
            200, 28, 174, 203, 31, 177, 205, 33, 179, 207, 35, 181, 209, 37, 183, 211, 39, 185, 213, 41, 187, 216, 44,
            190, 217, 45, 191, 197, 112, 171, 198, 113, 172, 201, 116, 175, 203, 118, 177, 205, 120, 179, 207, 122, 181,
            209, 124, 183, 211, 126, 185, 214, 129, 188, 215, 130, 189, 45, 170, 19, 46, 171, 20, 49, 174, 23, 51, 176,
            25, 53, 178, 27, 55, 180, 29, 57, 182, 31, 59, 184, 33, 62, 187, 36, 63, 188, 37]
        #expect(resize(toWidth: 10, toHeight: 6) == pil)
    }

    @Test func oneAxisMatchesPillow() {
        let pil: [UInt8] = [74, 120, 137, 77, 123, 140, 80, 126, 143, 83, 129, 146, 86, 132, 149, 89, 135, 152, 92, 138,
            155, 153, 100, 119, 156, 103, 122, 159, 106, 125, 162, 109, 128, 165, 112, 131, 168, 115, 134, 171, 118,
            137]
        #expect(resize(toWidth: 7, toHeight: 2) == pil)
        #expect(resize(toWidth: 7, toHeight: 5) == Self.source)
    }

    private func resize(toWidth: Int, toHeight: Int) -> [UInt8] {
        Self.source.withUnsafeBufferPointer {
            ImageSizing.resizeBicubic($0.baseAddress!, width: 7, height: 5, toWidth: toWidth, toHeight: toHeight)
        }
    }
}
