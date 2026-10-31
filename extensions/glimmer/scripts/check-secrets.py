import pathlib
import shutil
import subprocess
import sys
import tempfile


def main():
    mode, *files = sys.argv[1:]
    if mode not in ("verified", "private-keys"):
        return 1
    scanner = shutil.which("trufflehog")
    if not scanner:
        print("Secret scan unavailable: install TruffleHog locally.", file=sys.stderr)
        return 1
    options = ["--results=verified"] if mode == "verified" else [
        "--include-detectors=PrivateKey", "--no-verification", "--results=verified,unverified"
    ]
    with tempfile.TemporaryDirectory(prefix="glimmer-scan-") as temporary:
        root = pathlib.Path.cwd().resolve()
        for index, filename in enumerate(files):
            source = pathlib.Path(filename)
            if source.is_symlink() or not source.resolve().is_relative_to(root):
                print("Secret scan refused an external path or symlink.", file=sys.stderr)
                return 1
            if source.is_file():
                shutil.copyfile(source, pathlib.Path(temporary) / str(index))
        result = subprocess.run(
            [scanner, "filesystem", temporary, "--fail", "--fail-on-scan-errors",
             "--no-update", "--no-ignore-tag", *options],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
        )
    if result.returncode:
        print("Secret scan failed or found a credential; findings are withheld.", file=sys.stderr)
    return int(result.returncode != 0)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError):
        sys.exit("Secret scan could not complete; diagnostics are withheld.")
