#!/usr/bin/env python3
"""Inspect an offline plugin without executing it or guessing encryption keys."""
import argparse
import hashlib
import json
import math
import struct
from collections import Counter
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("package", type=Path)
args = parser.parse_args()
data = args.package.read_bytes()
counts = Counter(data)
entropy = -sum((count / len(data)) * math.log2(count / len(data)) for count in counts.values()) if data else 0
signatures = {"ZIP": b"PK\x03\x04", "GZIP": b"\x1f\x8b", "ASAR JSON header": b'{"files"', "ZSTD": b"\x28\xb5\x2f\xfd"}
report = {
    "filename": args.package.name,
    "bytes": len(data),
    "sha256": hashlib.sha256(data).hexdigest(),
    "entropy_bits_per_byte": round(entropy, 5),
    "first_32_bytes_hex": data[:32].hex(),
    "first_u32_le": struct.unpack("<I", data[:4])[0] if len(data) >= 4 else None,
    "signature_offsets": {name: data.find(magic) for name, magic in signatures.items()},
    "note": "Interior magic matches may be random bytes. This is an inspection report, not successful extraction. UPXS is documented by uTools as encrypted and developer-signed.",
}
print(json.dumps(report, indent=2, ensure_ascii=False))
