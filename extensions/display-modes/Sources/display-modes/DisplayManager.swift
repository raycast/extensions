import Foundation

/// Provides information about displays and their modes
/// and allows to change the mode of a given display..
protocol DisplayManager {
    func listDisplays() -> [Display]?
    func currentMode(for displayID: Int) -> Mode?
    func listBestModes(for displayID: Int) -> [Mode]?
    
    func setBestMode(
        for displayID: Int,
        width: Int?,
        height: Int?,
        refreshRate: Int?,
        scale: Int?
    ) -> Bool
}
