import Foundation

struct NativeWindowInput: Decodable {
  let id: Int
  let pid: Int32
  let space: Int?
  let title: String?
  let documentUrl: String?
}
