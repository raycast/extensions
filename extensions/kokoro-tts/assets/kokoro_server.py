#!/usr/bin/env python3
"""Persistent MLX-Kokoro TTS server: streaming English synthesis.

Runs the Kokoro-82M model on Apple's MLX framework (Metal-accelerated, no
PyTorch). Renders text sentence-by-sentence and streams each sentence as a
length-prefixed WAV frame so playback can start almost immediately.
"""
import argparse
import hashlib
import io
import os
import threading
from collections import OrderedDict

import numpy as np
import soundfile as sf
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from mlx_audio.tts.models.kokoro import Model as KokoroModel
from mlx_audio.tts.utils import load_model

app = FastAPI()

PID_PATH = "/tmp/raycast-kokoro-server.pid"
SAMPLE_RATE = 24000

# Split input into sentences so each one can be synthesised and played back
# while the rest is still generating.
SPLIT_PATTERN = r"\n+|(?<=[.!?…])\s+"
CACHE_MAX = 32

# --- Global state ---
_model = None
# MLX inference is not thread-safe; this lock serialises model load + generate.
_model_lock = threading.Lock()
_cache: "OrderedDict[str, list[np.ndarray]]" = OrderedDict()
_cache_lock = threading.Lock()
idle_timer: threading.Timer | None = None
_timer_lock = threading.Lock()
idle_timeout: int = 900


def get_model():
    """Lazily load the MLX Kokoro model. Caller must hold _model_lock."""
    global _model
    if _model is None:
        _model = load_model(KokoroModel.REPO_ID)
    return _model


def to_numpy(audio) -> np.ndarray:
    """Normalise an MLX audio segment to a float32 numpy array."""
    return np.asarray(audio, dtype=np.float32)


def encode_wav(samples: np.ndarray) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, samples, SAMPLE_RATE, format="WAV")
    return buf.getvalue()


def cache_key(text: str, voice: str, speed: float) -> str:
    return hashlib.sha256(f"{voice}|{speed}|{text}".encode("utf-8")).hexdigest()


def cache_get(key: str) -> "list[np.ndarray] | None":
    with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]
    return None


def cache_put(key: str, segments: "list[np.ndarray]") -> None:
    if not segments:
        return
    with _cache_lock:
        _cache[key] = segments
        _cache.move_to_end(key)
        while len(_cache) > CACHE_MAX:
            _cache.popitem(last=False)


def shutdown() -> None:
    try:
        os.unlink(PID_PATH)
    except FileNotFoundError:
        pass
    # Hard exit: skips atexit/finally but ensures the process dies cleanly
    # from the timer thread without needing to coordinate with uvicorn.
    os._exit(0)


def reset_idle_timer() -> None:
    global idle_timer
    with _timer_lock:
        if idle_timer is not None:
            idle_timer.cancel()
        idle_timer = threading.Timer(idle_timeout, shutdown)
        idle_timer.daemon = True
        idle_timer.start()


class SpeakRequest(BaseModel):
    text: str
    voice: str = "af_bella"
    speed: float = Field(default=1.0, gt=0, le=5.0)


@app.get("/health")
def health() -> dict[str, str]:
    reset_idle_timer()
    return {"status": "ok"}


@app.post("/speak/stream")
def speak_stream(req: SpeakRequest) -> StreamingResponse:
    """Stream the utterance sentence-by-sentence as length-prefixed WAV frames.

    Each frame is a 4-byte big-endian length followed by that many bytes of
    standalone WAV data.
    """
    reset_idle_timer()
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")

    key = cache_key(req.text, req.voice, req.speed)
    lang_code = "b" if req.voice[:1] == "b" else "a"

    def frames():
        def frame(samples: np.ndarray) -> bytes:
            data = encode_wav(samples)
            return len(data).to_bytes(4, "big") + data

        cached = cache_get(key)
        if cached is not None:
            for segment in cached:
                yield frame(segment)
            return

        collected: list[np.ndarray] = []
        with _model_lock:
            model = get_model()
            for result in model.generate(
                req.text,
                voice=req.voice,
                speed=req.speed,
                lang_code=lang_code,
                split_pattern=SPLIT_PATTERN,
            ):
                if result.audio is None:
                    continue
                segment = to_numpy(result.audio)
                collected.append(segment)
                reset_idle_timer()
                yield frame(segment)
        cache_put(key, collected)

    return StreamingResponse(frames(), media_type="application/octet-stream")


def preload() -> None:
    """Warm the model and G2P pipeline so the first real request is fast."""
    try:
        with _model_lock:
            model = get_model()
            for _ in model.generate("OK.", voice="af_bella", lang_code="a"):
                pass
    except Exception:
        # Lazy loading on the first request will surface any real error.
        pass


def write_pid() -> None:
    with open(PID_PATH, "w") as f:
        f.write(str(os.getpid()))


def main() -> None:
    global idle_timeout

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=7680)
    parser.add_argument("--idle-timeout", type=int, default=900)
    args = parser.parse_args()

    idle_timeout = args.idle_timeout

    write_pid()
    reset_idle_timer()
    threading.Thread(target=preload, daemon=True).start()

    config = uvicorn.Config(
        app, host="127.0.0.1", port=args.port, log_level="warning"
    )
    server = uvicorn.Server(config)
    server.run()


if __name__ == "__main__":
    main()
