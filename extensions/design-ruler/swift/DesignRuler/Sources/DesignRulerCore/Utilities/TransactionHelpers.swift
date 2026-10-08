import QuartzCore

extension CATransaction {
    /// Execute a block with all implicit animations disabled.
    package static func instant(_ body: () -> Void) {
        begin()
        setDisableActions(true)
        body()
        commit()
    }

    /// Execute a block with explicit animation duration and optional timing function.
    /// Defaults to easeOut timing when no timing function is provided.
    package static func animated(duration: CFTimeInterval, timing: CAMediaTimingFunctionName = .easeOut, _ body: () -> Void) {
        begin()
        setAnimationDuration(duration)
        setAnimationTimingFunction(CAMediaTimingFunction(name: timing))
        body()
        commit()
    }
}
