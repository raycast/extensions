# Verifying the Linux paths

The container runs the test suite plus a Linux-only smoke test: creating a
profile writes a `.desktop` launcher, a badge, and a registry entry under the
XDG directories. It never installs or launches Claude Desktop.

```bash
docker build -f docker/Dockerfile -t claude-profiles-test .
```

```bash
docker run --rm claude-profiles-test
```

Running the suite on Linux matters because every path the package resolves
branches on the platform: macOS uses `~/Library/Application Support`, Linux uses
the XDG variables. The fixtures redirect `HOME` and clear `XDG_*`, so the same
tests exercise whichever branch the host is on.
