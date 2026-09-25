# System Information

Get quick access to your system information so that you never have to open System Settings! You can access the following:

- Hostname
- Chip / Processor
- Memory
- Serial Number
- OS version
- Kernel version
- Disk Usage (free/total space in GB)
- IP address of connected network devices
- Currently running processes

> [!NOTE]
> **On macOS:** A Mac with Apple Silicon running macOS Monterey or later is required.

Works on both macOS and Windows:

- **macOS**: Uses `system_profiler`, native system APIs, and shows the "About This Mac" layout
- **Windows**: Uses WMI/CIM data via `systeminformation`, and shows the "About This PC" layout with physical disk info (e.g. "512 GB SSD"), installed memory (e.g. "16 GB"), and the Windows build number
