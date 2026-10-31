#!/usr/bin/env python3
"""Generates the bundled confirmation sounds in assets/ (run from the extension root)."""
import wave
import numpy as np

RATE = 44_100


def tone(freq, start, length, amp, decay, harmonics=((1, 1.0), (2, 0.25), (3, 0.08)), total=None):
    n = int(RATE * (total or (start + length)))
    t = np.arange(n) / RATE
    out = np.zeros(n)
    local = t - start
    active = (local >= 0) & (local < length)
    env = np.zeros(n)
    attack = 0.004
    env[active] = np.minimum(local[active] / attack, 1.0) * np.exp(-local[active] / decay)
    for mult, weight in harmonics:
        out += weight * np.sin(2 * np.pi * freq * mult * t) * env
    return amp * out


def write(path, signal):
    signal = np.clip(signal, -1, 1)
    data = (signal * 32767).astype("<i2")
    with wave.open(path, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(data.tobytes())
    print("wrote", path, f"{len(signal) / RATE * 1000:.0f} ms")


# Chime: two soft ascending bell notes (A5 then E6), ~400 ms, gentle level.
chime = tone(880.0, 0.0, 0.32, 0.28, 0.09, total=0.42) + tone(1318.5, 0.09, 0.33, 0.30, 0.11, total=0.42)
write("assets/chime.wav", chime)

# Blip: one short marimba-like note (C6), ~180 ms.
blip = tone(1046.5, 0.0, 0.18, 0.32, 0.05, harmonics=((1, 1.0), (4, 0.15)), total=0.2)
write("assets/blip.wav", blip)

