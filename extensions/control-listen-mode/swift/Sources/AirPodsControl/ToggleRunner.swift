import Darwin

struct ToggleResult: Encodable {
    let ok: Bool
    var mode: String? = nil
    var error: String? = nil
}

func runToggle(lockPath: String) -> ToggleResult {
    let fd = open(lockPath, O_CREAT | O_RDWR | O_CLOEXEC | O_NOFOLLOW, mode_t(0o600))
    guard fd >= 0 else { return ToggleResult(ok: false, error: Failure.lockFailed.rawValue) }
    defer { close(fd) }

    guard flock(fd, LOCK_EX | LOCK_NB) == 0 else {
        let error: Failure = errno == EWOULDBLOCK ? .busy : .lockFailed
        return ToggleResult(ok: false, error: error.rawValue)
    }

    do {
        let mode = try ListeningModeController(audio: CoreAudioBackend()).toggle()
        return ToggleResult(ok: true, mode: mode.label)
    } catch {
        return ToggleResult(ok: false, error: error.rawValue)
    }
}
