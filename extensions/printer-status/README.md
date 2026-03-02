# Printer Status

This Raycast extension allows you to quickly check key information about your **Xerox WorkCentre 6515** printer directly from Raycast.

## How it works

The extension communicates with your printer over the network using the **SNMP** protocol.

### What is SNMP?

**SNMP (Simple Network Management Protocol)** is a standard protocol used for monitoring and managing devices on an IP network. It allows applications to query devices (like routers, switches, and printers) to retrieve statistics and configuration details.

### What are OIDs?

To get specific data, SNMP relies on **OIDs (Object Identifiers)**. An OID is a unique sequence of numbers (formatted like `1.3.6.1.2.1.43.10.2.1.4.1.1`) that points to a specific variable or value within the device's database (MIB - Management Information Base).

This extension uses specific OIDs mapped to the Xerox WorkCentre 6515 to fetch data such as:

- Page counts
- Toner levels (if implemented)
- Device status

## Configuration

To use this extension, you must provide the IP address of your printer.

1. Install the extension.
2. Go to **Raycast Settings** → **Extensions** → **Printer Status**.
3. Enter your printer's IP address in the **Printer IP Address** field (default: `192.168.1.10`).
