//! Windows only. Blip's engine listens on a Unix-domain socket (%TEMP%\net.blip.desktop\sock), and
//! Node can't open those on Windows. These functions do the socket part for the extension: one
//! DRPC request/response exchange per call. Framing and protobuf stay in TypeScript.

use base64::{engine::general_purpose::STANDARD, Engine};
use raycast_rust_macros::raycast;
use std::io::{ErrorKind, Read, Write};
use std::time::{Duration, Instant};
use uds_windows::UnixStream;

/// Error prefixes the TypeScript side maps to its own error types.
const NOT_LISTENING: &str = "not-listening";
const TIMED_OUT: &str = "timed-out";

/// DRPC frame kinds that matter here.
const KIND_MESSAGE: u8 = 2;
const KIND_ERROR: u8 = 3;
const KIND_CLOSE: u8 = 5;
const KIND_CLOSE_SEND: u8 = 6;

fn connect(socket_path: &str) -> Result<UnixStream, String> {
    UnixStream::connect(socket_path).map_err(|error| format!("{NOT_LISTENING}: {error}"))
}

/// Whether Blip is accepting connections.
#[raycast]
fn blip_is_listening(socket_path: String) -> bool {
    connect(&socket_path).is_ok()
}

/// Sends one complete DRPC unary request (base64) and returns, base64-encoded, every byte Blip
/// sent back until the call ended: a final Message, an Error, CloseSend or Close.
#[raycast]
fn blip_unary_call(socket_path: String, request: String, timeout_ms: u64) -> Result<String, String> {
    let request = STANDARD.decode(request).map_err(|error| error.to_string())?;
    let deadline = Instant::now() + Duration::from_millis(timeout_ms.max(1));
    let mut stream = connect(&socket_path)?;
    stream
        .set_write_timeout(Some(Duration::from_millis(timeout_ms.max(1))))
        .map_err(|error| error.to_string())?;
    stream.write_all(&request).map_err(|error| error.to_string())?;

    let mut received = Vec::new();
    let mut buffer = [0u8; 64 * 1024];
    while !call_finished(&received) {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(TIMED_OUT.into());
        }
        stream
            .set_read_timeout(Some(remaining))
            .map_err(|error| error.to_string())?;
        match stream.read(&mut buffer) {
            Ok(0) => break, // Blip closed the connection; TypeScript reports what it got.
            Ok(read) => received.extend_from_slice(&buffer[..read]),
            Err(error) if error.kind() == ErrorKind::Interrupted => continue,
            Err(error) if matches!(error.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut) => {
                return Err(TIMED_OUT.into())
            }
            Err(error) => return Err(error.to_string()),
        }
    }
    Ok(STANDARD.encode(received))
}

fn read_varint(bytes: &[u8], mut at: usize) -> Option<(u64, usize)> {
    let mut value = 0u64;
    let mut shift = 0;
    while at < bytes.len() && shift < 64 {
        let byte = bytes[at];
        at += 1;
        value |= u64::from(byte & 0x7f) << shift;
        if byte < 0x80 {
            return Some((value, at));
        }
        shift += 7;
    }
    None
}

/// True once `bytes` holds a complete frame that ends a unary call.
fn call_finished(bytes: &[u8]) -> bool {
    let mut at = 0;
    while at < bytes.len() {
        let control = bytes[at];
        let Some((_, after_stream)) = read_varint(bytes, at + 1) else { return false };
        let Some((_, after_message)) = read_varint(bytes, after_stream) else { return false };
        let Some((length, after_length)) = read_varint(bytes, after_message) else { return false };
        let Some(end) = usize::try_from(length).ok().and_then(|length| after_length.checked_add(length)) else {
            return false;
        };
        if end > bytes.len() {
            return false;
        }
        at = end;
        // Frames with the control bit set belong to the transport and are ignored.
        if control & 0x80 != 0 {
            continue;
        }
        let kind = (control >> 1) & 0x3f;
        let done = control & 1 == 1;
        if (kind == KIND_MESSAGE && done) || matches!(kind, KIND_ERROR | KIND_CLOSE | KIND_CLOSE_SEND) {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    fn frame(kind: u8, done: bool, data: &[u8]) -> Vec<u8> {
        let mut bytes = vec![(kind << 1) | u8::from(done), 1, 1, data.len() as u8];
        bytes.extend_from_slice(data);
        bytes
    }

    #[test]
    fn a_call_ends_on_a_final_message_error_or_close() {
        assert!(!call_finished(&[]));
        assert!(!call_finished(&frame(KIND_MESSAGE, false, b"part")));
        assert!(call_finished(&frame(KIND_MESSAGE, true, b"all")));
        assert!(call_finished(&frame(KIND_ERROR, true, b"oops")));
        assert!(call_finished(&frame(KIND_CLOSE_SEND, true, b"")));
    }

    #[test]
    fn incomplete_frames_and_control_frames_dont_end_a_call() {
        let whole = frame(KIND_MESSAGE, true, b"hello");
        assert!(!call_finished(&whole[..whole.len() - 1]));
        let mut control = frame(KIND_MESSAGE, true, b"x");
        control[0] |= 0x80;
        assert!(!call_finished(&control));
    }
}
