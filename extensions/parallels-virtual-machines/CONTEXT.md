# Parallels Virtual Machines

Provide a public Raycast Extension that remains correct as the Parallels registry, VM state, names, and locations change.

## Language

**Registered VM**:
A non-template virtual machine currently known to Parallels Desktop. Its normalized UUID is its identity; name, state, and location are observations.
_Avoid_: VM file, `.pvm` entry

**Open or Switch**:
The single user intent that starts, resumes, or focuses a Registered VM according to current state.
_Avoid_: name activation, open launcher

**Focus Proxy**:
The unique regular Parallels Dock Helper for one VM UUID. Activating it moves macOS to that VM's Space and foregrounds its window.
_Avoid_: Parallels Control Center, `prl_vm_app`, Coherence Helper

**Host Adapter**:
The local-substitutable boundary around `prlctl`, AppKit/JXA, process execution, and time. Raycast UI code does not know these mechanisms.

## Invariants

- Registry snapshots exclude templates, reject malformed records and duplicate UUIDs, and sort deterministically.
- Every action revalidates the Registered VM by UUID instead of trusting cached names, paths, or states.
- Open or Switch activates only the unique regular Focus Proxy. It never falls back to name-based AppleScript.
- External commands receive argument arrays; VM-derived values are not interpolated into shell or JXA source.
- Raycast is a runtime UI adapter. The Registered VMs module owns registry, state, activation ordering, timeout, and error semantics.

## Retired public architecture

Launcher App, Launcher Catalog, and Reconciliation belonged to the predecessor that generated `.app` bundles and installed a LaunchAgent. They are not part of the public extension runtime.
